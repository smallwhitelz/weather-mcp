const QWEATHER_BASE_URL = "https://pd5u9wkcpw.re.qweatherapi.com/v7";
const QWEATHER_GEO_URL = "https://pd5u9wkcpw.re.qweatherapi.com/geo/v2";
const REQUEST_TIMEOUT_MS = 5000;

function getApiKey(): string {
  const key = process.env.QWEATHER_API_KEY;
  if (!key) {
    throw new Error("环境变量 QWEATHER_API_KEY 未设置");
  }
  return key;
}

export interface QWeatherResponse<T> {
  code: string;
  updateTime?: string;
  fxLink?: string;
  now?: T;
  daily?: T[];
  warning?: T[];
}

export interface WeatherNow {
  obsTime: string;
  temp: string;
  feelsLike: string;
  text: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  vis: string;
}

export interface WeatherDaily {
  fxDate: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  pop?: string;
  uvIndex: string;
}

export interface WeatherWarning {
  id: string;
  sender: string;
  pubTime: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  level: string;
  type: string;
  typeName: string;
  text: string;
}

interface GeoCity {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
  country: string;
}

interface GeoResponse {
  code: string;
  location?: GeoCity[];
}

async function httpGet(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("请求超时（5s），请检查网络连接");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchQWeather<T>(
  path: string,
  params: Record<string, string>
): Promise<QWeatherResponse<T>> {
  const apiKey = getApiKey();
  const url = new URL(`${QWEATHER_BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("lang", "zh");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await httpGet(url);
  if (!res.ok) {
    throw new Error(`HTTP 错误：${res.status}`);
  }
  return (await res.json()) as QWeatherResponse<T>;
}

// 判断是否为坐标（如 116.41,39.92）或纯数字 LocationID
function isLocationId(location: string): boolean {
  return /^\d+$/.test(location.trim()) || /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location.trim());
}

// 城市名 → LocationID（通过 GeoAPI 查询）
export async function resolveLocationId(location: string): Promise<{ id: string; label: string }> {
  if (isLocationId(location)) {
    return { id: location.trim(), label: location.trim() };
  }

  const apiKey = getApiKey();
  const url = new URL(`${QWEATHER_GEO_URL}/city/lookup`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", location);
  url.searchParams.set("lang", "zh");

  const res = await httpGet(url);
  if (!res.ok) {
    throw new Error(`GeoAPI HTTP 错误：${res.status}`);
  }
  const data = (await res.json()) as GeoResponse;

  if (data.code !== "200" || !data.location || data.location.length === 0) {
    throw new Error(`找不到城市"${location}"，请检查拼写或改用经纬度`);
  }

  const city = data.location[0];
  const label = `${city.name}（${city.adm2 || city.adm1}，${city.country}）`;
  return { id: city.id, label };
}

export async function fetchWeatherNow(location: string): Promise<QWeatherResponse<WeatherNow>> {
  return fetchQWeather<WeatherNow>("/weather/now", { location });
}

export async function fetchWeatherDaily(
  location: string,
  days: number
): Promise<QWeatherResponse<WeatherDaily>> {
  const endpoint = days <= 3 ? "/weather/3d" : "/weather/7d";
  return fetchQWeather<WeatherDaily>(endpoint, { location });
}

export async function fetchWeatherWarning(
  location: string
): Promise<QWeatherResponse<WeatherWarning>> {
  return fetchQWeather<WeatherWarning>("/warning/now", { location });
}

export function resolveQWeatherError(code: string): string {
  const codeMap: Record<string, string> = {
    "200": "成功",
    "204": "请求成功，该地区暂无该类型数据",
    "400": "请求错误，请检查城市名称或经纬度格式",
    "401": "API Key 无效，请检查 QWEATHER_API_KEY",
    "402": "API Key 已超出访问次数限制",
    "403": "无权限访问该接口，请检查订阅套餐",
    "404": "查询的地区不存在，请检查输入",
    "429": "超过 API 访问频率限制，请稍后再试",
    "500": "和风天气服务端错误，请稍后重试",
  };
  return codeMap[code] ?? `未知错误（code: ${code}）`;
}
