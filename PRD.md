# PRD：天气 MCP 服务

## 1. 项目概述

**项目名称**：Weather MCP Server
**技术栈**：Node.js / TypeScript + MCP SDK + 和风天气 API
**目标**：为 AI 助手提供实时天气查询能力，通过 MCP 协议暴露两个工具函数

---

## 2. 功能需求

### Tool 1：`get_weather_warning` — 天气预警查询

| 项目 | 说明 |
|------|------|
| **功能描述** | 查询指定地区当前生效的气象灾害预警信息 |
| **输入参数** | `location: string` — 城市名称（如"北京"）或 LocationID 或经纬度（如"116.41,39.92"） |
| **输出内容** | 预警标题、预警类型、预警级别、发布机构、生效时间、失效时间、预警详情文本 |
| **无预警情况** | 返回"当前该地区无有效预警信息" |
| **API 端点** | `GET https://devapi.qweather.com/v7/warning/now` |

**输出示例**
```
地区：广州
预警数量：2 条
─────────────────
[1] 暴雨橙色预警
    发布机构：广州市气象台
    生效时间：2026-03-06 08:00
    失效时间：2026-03-06 20:00
    详情：预计未来 6 小时内...
```

---

### Tool 2：`get_weather` — 城市天气查询

| 项目 | 说明 |
|------|------|
| **功能描述** | 查询指定城市的实时天气 + 未来 3 天预报 |
| **输入参数** | `location: string` — 城市名称或经纬度；`days?: number` — 预报天数，默认 3，最大 7 |
| **输出内容** | 实时天气（温度、体感温度、天气描述、湿度、风向风速、能见度）+ 逐日预报（最高/最低温、降水概率、紫外线指数） |
| **API 端点** | 实时：`GET https://devapi.qweather.com/v7/weather/now`；预报：`GET https://devapi.qweather.com/v7/weather/3d` 或 `7d` |

**输出示例**
```
城市：上海
─────────────────
【实时天气】
天气：多云  温度：18°C（体感 16°C）
湿度：72%  风向：东南风 3 级（12km/h）
能见度：15km  更新时间：2026-03-06 14:00

【3 天预报】
03-06（今天）：多云  12~20°C  降水概率 20%  紫外线：低
03-07（明天）：小雨  10~16°C  降水概率 75%  紫外线：低
03-08（后天）：阴    11~17°C  降水概率 40%  紫外线：低
```

---

## 3. 非功能需求

| 项目 | 要求 |
|------|------|
| **API 鉴权** | 和风天气 API Key 通过环境变量 `QWEATHER_API_KEY` 注入，不硬编码 |
| **错误处理** | 网络超时、无效城市名、API 限流均返回友好错误提示 |
| **响应格式** | 纯文本，适合 AI 直接读取并转述给用户 |
| **超时设置** | HTTP 请求超时 5 秒 |
| **语言支持** | 默认返回简体中文（`lang=zh`） |

---

## 4. 技术架构

```
Claude / AI Client
       │  MCP Protocol (stdio)
       ▼
Weather MCP Server (TypeScript)
  ├── tool: get_weather_warning
  │     └── GET /v7/warning/now
  └── tool: get_weather
        ├── GET /v7/weather/now
        └── GET /v7/weather/3d (or 7d)
              │
              ▼
         和风天气 API
```

---

## 5. 配置项

```jsonc
// claude_desktop_config.json 示例
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "QWEATHER_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

---

## 6. 交付物

- [ ] `src/index.ts` — MCP Server 入口
- [ ] `src/tools/warning.ts` — 预警查询逻辑
- [ ] `src/tools/weather.ts` — 天气查询逻辑
- [ ] `src/utils/qweather.ts` — 和风天气 HTTP 客户端封装
- [ ] `README.md` — 使用说明 & API Key 申请指引

---

## 7. 依赖

```json
{
  "@modelcontextprotocol/sdk": "latest",
  "zod": "^3.x"
}
```

和风天气 API Key 申请地址：[console.qweather.com](https://console.qweather.com)，免费版每天 1000 次调用，足够开发测试使用。
