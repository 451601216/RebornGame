import type { LifeEvent, LifeRecord, PlayerInput } from "./types";

const RECENT_EVENTS = 5;

function compactEvent(ev: LifeEvent) {
  return {
    turn: ev.turn,
    age: ev.age,
    narrative: ev.narrative,
    uiType: ev.ui.type,
    playerInput: ev.playerInput ?? null,
    death: ev.death ?? null,
  };
}

export function buildTurnUserPrompt(life: LifeRecord, playerInput: PlayerInput): string {
  const recent = life.events.slice(-RECENT_EVENTS).map(compactEvent);
  const lastUiType = life.events[life.events.length - 1]?.ui.type;

  const avoidTags = life.events
    .slice(-8)
    .map((e) => e.narrative.slice(0, 24))
    .filter(Boolean);

  return `当世档案（仅此一世）：
profile: ${JSON.stringify(life.profile)}
state: ${JSON.stringify(life.state)}
summary: ${life.summary || "（暂无）"}
近期事件: ${JSON.stringify(recent)}
上一轮 ui.type: ${lastUiType ?? "无"}（若情节允许，本轮尽量换一种交互类型）
避免重复的情节片段标签: ${JSON.stringify(avoidTags)}

玩家本轮输入: ${JSON.stringify(playerInput)}

请生成下一轮事件 JSON。`;
}

export function buildSummaryUserPrompt(life: LifeRecord): string {
  const older = life.events.slice(0, Math.max(0, life.events.length - RECENT_EVENTS));
  const compact = older.map((e) => ({
    turn: e.turn,
    age: e.age,
    narrative: e.narrative.slice(0, 120),
    input: e.playerInput ?? null,
  }));

  return `profile: ${JSON.stringify(life.profile)}
当前 state: ${JSON.stringify(life.state)}
旧 summary: ${life.summary || "（无）"}
较早事件（需压缩）: ${JSON.stringify(compact)}`;
}

export const SUMMARY_EVENT_THRESHOLD = 8;
