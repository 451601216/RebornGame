import {
  getThemeProgress,
  getThemeStage,
  parseMemoryCardText,
} from "./memoryCard";
import type { LifeEvent, LifeRecord, LifeState, PlayerInput } from "./types";

/** 事件数达到后开始更新记忆卡；之后每 N 次事件轻量更新一次 */
export const SUMMARY_START_AT = 2;
export const SUMMARY_UPDATE_EVERY = 2;

/** @deprecated 使用 SUMMARY_START_AT / SUMMARY_UPDATE_EVERY */
export const SUMMARY_EVENT_THRESHOLD = SUMMARY_START_AT;

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function compactPlayerInput(input: PlayerInput | null | undefined) {
  if (!input) return null;
  switch (input.type) {
    case "single":
      return { type: "single", label: input.label };
    case "multi":
      return { type: "multi", labels: input.labels };
    case "fill":
      return { type: "fill", values: input.values };
    case "fill_choice":
      return {
        type: "fill_choice",
        label: input.label,
        values: input.values,
      };
    case "none":
      return { type: "none" };
  }
}

/** 上一拍短卡：叙事截断，不含多轮历史 */
export function compactBeat(
  ev: LifeEvent,
  playerInput?: PlayerInput | null,
) {
  return {
    turn: ev.turn,
    age: ev.age,
    beat: truncate(ev.narrative, 80),
    uiType: ev.ui.type,
    playerInput: compactPlayerInput(playerInput ?? ev.playerInput),
    ending: ev.ending
      ? { type: ev.ending.type, cause: ev.ending.cause }
      : ev.death?.died
        ? { type: "death" as const, cause: ev.death.cause }
        : null,
  };
}

function profileFingerprint(life: LifeRecord) {
  return {
    name: life.profile.name,
    era: life.profile.era,
    birth: life.profile.birth,
    traits: life.profile.traits,
    themeHook: life.profile.themeHook,
  };
}

function compactState(state: LifeState) {
  const out: Record<string, unknown> = {
    age: state.age,
    location: state.location,
    health: state.health,
    mind: state.mind,
    relationships: state.relationships,
  };
  if (state.inventory.length > 0) out.inventory = state.inventory;
  if (Object.keys(state.flags).length > 0) out.flags = state.flags;
  return out;
}

/**
 * 推进上下文：身份指纹 + state + 记忆卡 + 上一拍（含本轮输入）。
 * 不再注入多轮事件全文。
 */
export function buildTurnUserPrompt(
  life: LifeRecord,
  playerInput: PlayerInput,
): string {
  const last = life.events[life.events.length - 1];
  const lastBeat = last ? compactBeat(last, playerInput) : null;
  const card = parseMemoryCardText(life.summary);
  const themeBlock = {
    themeHook: life.profile.themeHook,
    themeProgress: getThemeProgress(life.summary),
    themeStage: getThemeStage(life.summary),
    unfinished: card?.unfinished ?? [],
  };

  return `当世上下文（仅此一世；长期记忆以记忆卡为准，勿编造卡外细节）：
身份指纹: ${JSON.stringify(profileFingerprint(life))}
炼心课题: ${JSON.stringify(themeBlock)}
state: ${JSON.stringify(compactState(life.state))}
记忆卡:
${life.summary?.trim() || "（暂无，请依据身份指纹与上一拍续写）"}

上一拍: ${JSON.stringify(lastBeat)}
上一拍 ui.type: ${lastBeat?.uiType ?? "无"}（本轮尽量换一种交互类型）

请根据上一拍与玩家输入生成下一事件 JSON。勿输出 death / enlightenment。`;
}

/**
 * 摘要更新：旧记忆卡 + 刚结束的一拍 + 当前 state，禁止喂全部早期事件。
 */
export function buildSummaryUserPrompt(
  life: LifeRecord,
  closedBeat: LifeEvent,
): string {
  return `身份指纹: ${JSON.stringify(profileFingerprint(life))}
炼心课题: ${JSON.stringify({
    themeHook: life.profile.themeHook,
    themeProgress: getThemeProgress(life.summary),
    themeStage: getThemeStage(life.summary),
  })}
当前 state: ${JSON.stringify(compactState(life.state))}
旧记忆卡:
${life.summary?.trim() || "（无）"}

刚结束的一拍（据此合并更新记忆卡，勿扩写未提及事实）:
${JSON.stringify(compactBeat(closedBeat))}

请输出更新后的记忆卡 JSON（含 themeProgress / themeStage / milestones）。`;
}

export function shouldUpdateMemoryCard(eventCount: number): boolean {
  if (eventCount < SUMMARY_START_AT) return false;
  return eventCount % SUMMARY_UPDATE_EVERY === 0;
}
