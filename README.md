# RebornGame · 轮回炼心

[中文文档](./README.zh-CN.md)

A text-based reincarnation game powered by LLM. Each life—from birth to death—is generated dynamically. The UI renders single-choice, multi-choice, and fill-in interactions based on each event. Every turn is persisted atomically to `saves/life-XXX.json`.

## Features

- **New life generation** — LLM creates a unique profile (era, background, theme) and avoids duplicating past lives
- **Dynamic interactions** — `single` / `multi` / `fill` / `fill_choice` / `none` driven by LLM output
- **Per-life isolation** — turn context reads only the current save; no cross-life memory in gameplay
- **Atomic saves** — each turn appends events and merges state to disk
- **Real LLM only** — no mock or offline fallback

## Requirements

- Node.js 20+
- OpenAI-compatible API (DeepSeek, OpenAI, SiliconFlow, etc.)

## Setup

Copy `.env.example` to `.env.local`:

```env
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Saves

- Location: `saves/life-001.json`, `life-002.json`, …
- `POST /api/life` — start a new life (deduped against past profiles)
- `GET /api/life` — list saves
- `GET /api/life/[id]` — load a life
- `POST /api/life/[id]/turn` — submit player input and advance

## Project structure

```
src/
  app/              # Next.js pages & API routes
  components/       # Game UI & dynamic action panels
  lib/game/         # Engine, schema, prompts, life store
  lib/llm/          # OpenAI-compatible client
saves/              # Per-life JSON saves (gitignored)
```

## Stack

- Next.js 16 (App Router) + TypeScript + React
- Zod for LLM output validation
- OpenAI SDK (compatible endpoints)

## License

MIT
