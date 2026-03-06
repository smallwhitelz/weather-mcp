# Weather MCP Server

基于[和风天气](https://dev.qweather.com/) API 的 MCP 服务，为 AI 助手提供实时天气查询和气象预警能力。

## 工具说明

### `get_weather_warning` — 天气预警查询
查询指定地区当前生效的气象灾害预警信息。

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| location | string | 是 | 城市名称（如"北京"）、LocationID 或经纬度（如"116.41,39.92"） |

### `get_weather` — 城市天气查询
查询指定城市的实时天气 + 未来多天预报。

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| location | string | 是 | 城市名称或经纬度 |
| days | number | 否 | 预报天数，默认 3，最大 7 |

## 快速开始

### 1. 申请 API Key

前往 [console.qweather.com](https://console.qweather.com) 注册并创建应用，获取 API Key。
免费版每天 1000 次调用，足够日常使用。

### 2. 安装依赖并构建

```bash
npm install
npm run build
```

### 3. 配置 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/to/weather-mcp/dist/index.js"],
      "env": {
        "QWEATHER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

重启 Claude Desktop 即可使用。

## 项目结构

```
weather-mcp/
├── src/
│   ├── index.ts              # MCP Server 入口
│   ├── tools/
│   │   ├── warning.ts        # 天气预警查询逻辑
│   │   └── weather.ts        # 城市天气查询逻辑
│   └── utils/
│       └── qweather.ts       # 和风天气 HTTP 客户端封装
├── PRD.md                    # 产品需求文档
├── package.json
└── tsconfig.json
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `QWEATHER_API_KEY` | 和风天气 API Key（必填） |
