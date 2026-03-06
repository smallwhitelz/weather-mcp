import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { warningInputSchema, getWeatherWarning } from "./tools/warning.js";
import { weatherInputSchema, getWeather } from "./tools/weather.js";

const server = new McpServer({
  name: "weather-mcp",
  version: "1.0.0",
});

server.tool(
  "get_weather_warning",
  "查询指定地区当前生效的气象灾害预警信息，返回预警标题、级别、类型、发布机构、生效/失效时间及详情",
  warningInputSchema.shape,
  async (input) => {
    const result = await getWeatherWarning(input);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_weather",
  "查询指定城市的实时天气和未来多天预报，包含温度、体感温度、湿度、风向风速、能见度及逐日最高/最低温、降水概率、紫外线指数",
  weatherInputSchema.shape,
  async (input) => {
    const result = await getWeather(input);
    return { content: [{ type: "text", text: result }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server 已启动");
}

main().catch((err) => {
  console.error("启动失败：", err);
  process.exit(1);
});
