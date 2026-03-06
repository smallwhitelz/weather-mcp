import { z } from "zod";
import { fetchWeatherWarning, resolveLocationId, resolveQWeatherError } from "../utils/qweather.js";

export const warningInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .describe('城市名称（如"北京"）、LocationID 或经纬度（如"116.41,39.92"）'),
});

export type WarningInput = z.infer<typeof warningInputSchema>;

export async function getWeatherWarning(input: WarningInput): Promise<string> {
  const { location } = input;

  let locationId: string;
  let locationLabel: string;
  try {
    const resolved = await resolveLocationId(location);
    locationId = resolved.id;
    locationLabel = resolved.label;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `获取天气预警失败：${msg}`;
  }

  let data;
  try {
    data = await fetchWeatherWarning(locationId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `获取天气预警失败：${msg}`;
  }

  if (data.code !== "200") {
    return `查询失败：${resolveQWeatherError(data.code)}`;
  }

  const warnings = data.warning ?? [];

  if (warnings.length === 0) {
    return `地区：${locationLabel}\n当前该地区无有效预警信息。`;
  }

  const lines: string[] = [
    `地区：${locationLabel}`,
    `预警数量：${warnings.length} 条`,
    "─────────────────",
  ];

  warnings.forEach((w, idx) => {
    lines.push(`[${idx + 1}] ${w.title}`);
    lines.push(`    类型：${w.typeName}  级别：${w.level}`);
    lines.push(`    发布机构：${w.sender}`);
    if (w.startTime) lines.push(`    生效时间：${w.startTime}`);
    if (w.endTime) lines.push(`    失效时间：${w.endTime}`);
    lines.push(`    详情：${w.text}`);
    if (idx < warnings.length - 1) lines.push("");
  });

  return lines.join("\n");
}
