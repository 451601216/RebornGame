# 轮回炼心 · RebornGame

[English](./README.md)

文字类轮回游戏，由 LLM 驱动。每一世从出生到死亡动态生成；前端根据事件渲染单选、多选、填空等交互；每轮结果原子写入 `saves/life-XXX.json`。

## 功能

- **开世生成** — LLM 生成本世背景（时代、出身、炼心课题），并与既往各世去重
- **动态交互** — 由 LLM 声明 `single` / `multi` / `fill` / `fill_choice` / `none`，前端通用渲染
- **当世隔离** — 事件循环只读当前存档，玩法内不共享跨世记忆
- **原子存档** — 每轮追加 `events`、合并 `state` 后落盘
- **强制真实 LLM** — 无 mock、无离线预制剧情

## 环境要求

- Node.js 20+
- OpenAI 兼容 API（DeepSeek、OpenAI、SiliconFlow 等）

## 配置

复制 `.env.example` 为 `.env.local`：

```env
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

## 运行

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 存档与 API

- 路径：`saves/life-001.json`、`life-002.json` …
- `POST /api/life` — 开启新一世（对照既往 profile 去重）
- `GET /api/life` — 列出存档
- `GET /api/life/[id]` — 读取当世
- `POST /api/life/[id]/turn` — 提交玩家输入并推进回合

## 目录结构

```
src/
  app/              # Next.js 页面与 API
  components/       # 游戏 UI 与动态交互组件
  lib/game/         # 引擎、schema、prompt、存档
  lib/llm/          # OpenAI 兼容客户端
saves/              # 每世 JSON 存档（已 gitignore）
```

## 技术栈

- Next.js 16（App Router）+ TypeScript + React
- Zod 校验 LLM 输出
- OpenAI SDK（兼容端点）

## 许可

MIT
