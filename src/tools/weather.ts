import { z } from "zod";
import {
  fetchWeatherNow,
  fetchWeatherDaily,
  resolveLocationId,
  resolveQWeatherError,
} from "../utils/qweather.js";

export const weatherInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .describe('城市名称（如"上海"）或经纬度（如"121.47,31.23"）'),
  days: z
    .number()
    .int()
    .min(1)
    .max(7)
    .default(3)
    .describe("预报天数，默认 3 天，最大 7 天"),
});

export type WeatherInput = z.infer<typeof weatherInputSchema>;

const UV_INDEX_MAP: Record<string, string> = {
  "1": "最弱",
  "2": "弱",
  "3": "中等",
  "4": "强",
  "5": "很强",
  "6": "极强",
};

function uvLabel(index: string): string {
  return UV_INDEX_MAP[index] ?? index;
}

function dayLabel(fxDate: string, index: number): string {
  if (index === 0) return `${fxDate}（今天）`;
  if (index === 1) return `${fxDate}（明天）`;
  if (index === 2) return `${fxDate}（后天）`;
  return fxDate;
}

export async function getWeather(input: WeatherInput): Promise<string> {
  const { location, days } = input;

  let locationId: string;
  let locationLabel: string;
  try {
    const resolved = await resolveLocationId(location);
    locationId = resolved.id;
    locationLabel = resolved.label;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `获取天气失败：${msg}`;
  }

  const [nowResult, dailyResult] = await Promise.allSettled([
    fetchWeatherNow(locationId),
    fetchWeatherDaily(locationId, days),
  ]);

  const lines: string[] = [`城市：${locationLabel}`, "─────────────────"];

  // 实时天气
  if (nowResult.status === "fulfilled") {
    const nowData = nowResult.value;
    if (nowData.code !== "200") {
      lines.push(`【实时天气】查询失败：${resolveQWeatherError(nowData.code)}`);
    } else if (nowData.now) {
      const now = nowData.now;
      const updateTime = (nowData.updateTime ?? "").replace("T", " ").slice(0, 16);
      lines.push("【实时天气】");
      lines.push(`天气：${now.text}  温度：${now.temp}°C（体感 ${now.feelsLike}°C）`);
      lines.push(
        `湿度：${now.humidity}%  风向：${now.windDir} ${now.windScale} 级（${now.windSpeed}km/h）`
      );
      lines.push(`能见度：${now.vis}km  更新时间：${updateTime}`);
    }
  } else {
    lines.push(`【实时天气】获取失败：${nowResult.reason instanceof Error ? nowResult.reason.message : String(nowResult.reason)}`);
  }

  lines.push("");

  // 天气预报
  if (dailyResult.status === "fulfilled") {
    const dailyData = dailyResult.value;
    if (dailyData.code !== "200") {
      lines.push(`【${days} 天预报】查询失败：${resolveQWeatherError(dailyData.code)}`);
    } else if (dailyData.daily && dailyData.daily.length > 0) {
      const sliced = dailyData.daily.slice(0, days);
      lines.push(`【${sliced.length} 天预报】`);
      sliced.forEach((d, idx) => {
        const pop = d.pop ? `  降水概率 ${d.pop}%` : "";
        lines.push(
          `${dayLabel(d.fxDate, idx)}：${d.textDay}  ${d.tempMin}~${d.tempMax}°C${pop}  紫外线：${uvLabel(d.uvIndex)}`
        );
      });
    }
  } else {
    lines.push(`【${days} 天预报】获取失败：${dailyResult.reason instanceof Error ? dailyResult.reason.message : String(dailyResult.reason)}`);
  }

  return lines.join("\n");
}
