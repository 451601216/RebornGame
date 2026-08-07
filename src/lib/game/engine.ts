import { callLlmJson } from "@/lib/llm/client";
import {
  buildSummaryUserPrompt,
  buildTurnUserPrompt,
  shouldUpdateMemoryCard,
} from "./contextBuilder";
import {
  listPastProfiles,
  nextLifeId,
  readLife,
  writeLife,
} from "./lifeStore";
import {
  buildNewLifeSystemPrompt,
  buildNewLifeUserPrompt,
  buildSummarySystemPrompt,
  buildTurnSystemPrompt,
} from "./prompts";
import {
  newLifeLlmSchema,
  summaryLlmSchema,
  turnLlmSchema,
  type NewLifeLlmResult,
  type TurnLlmResult,
} from "./schema";
import { checkProfileSimilarity } from "./similarity";
import { applyStateDelta } from "./stateMerge";
import type { LifeEvent, LifeRecord, PlayerInput, ProfileFingerprint } from "./types";

const NEW_LIFE_SIM_RETRIES = 2;

function buildFingerprintPromptExtra(
  past: ProfileFingerprint[],
  reason: string,
): string {
  return `\n\n【驳回重试】${reason}\n既有指纹：${JSON.stringify(
    past.map((p) => ({
      id: p.id,
      era: p.era,
      background: p.background.slice(0, 40),
      traits: p.traits,
      themeHook: p.themeHook,
      nameStyle: p.name,
    })),
  )}`;
}

export async function createNewLife(): Promise<LifeRecord> {
  const past = await listPastProfiles();
  let rejectReason = "";
  let generated: NewLifeLlmResult | null = null;

  for (let attempt = 0; attempt <= NEW_LIFE_SIM_RETRIES; attempt++) {
    const user =
      buildNewLifeUserPrompt(past) +
      (rejectReason ? buildFingerprintPromptExtra(past, rejectReason) : "");

    const result = await callLlmJson({
      system: buildNewLifeSystemPrompt(),
      user,
      schema: newLifeLlmSchema,
      maxRetries: 1,
    });

    const sim = checkProfileSimilarity(result.profile, past);
    if (sim.tooSimilar) {
      rejectReason = sim.reason;
      continue;
    }
    generated = result;
    break;
  }

  if (!generated) {
    throw new Error(
      `开世背景与既往世过于相似，已重试 ${NEW_LIFE_SIM_RETRIES} 次仍失败。请再试一次开世。${rejectReason ? ` 最后原因：${rejectReason}` : ""}`,
    );
  }

  const id = await nextLifeId();
  const now = new Date().toISOString();
  const state = applyStateDelta(generated.state, generated.firstEvent.stateDelta);

  const firstEvent: LifeEvent = {
    turn: 1,
    age: state.age,
    narrative: generated.firstEvent.narrative,
    ui: generated.firstEvent.ui,
    stateDelta: generated.firstEvent.stateDelta,
    playerInput: null,
  };

  const life: LifeRecord = {
    id,
    meta: {
      startedAt: now,
      endedAt: null,
      status: "alive",
    },
    profile: generated.profile,
    state,
    events: [firstEvent],
    summary: generated.summary,
  };

  await writeLife(life);
  return life;
}

/**
 * 用「旧记忆卡 + 刚结束的一拍」轻量更新；不再回放全部早期事件。
 */
async function maybeUpdateMemoryCard(life: LifeRecord): Promise<LifeRecord> {
  if (!shouldUpdateMemoryCard(life.events.length)) return life;

  // 倒数第二条：刚被玩家回应并关闭的一拍；最新一条是本轮新事件
  const closedBeat =
    life.events.length >= 2
      ? life.events[life.events.length - 2]
      : life.events[life.events.length - 1];
  if (!closedBeat) return life;

  const result = await callLlmJson({
    system: buildSummarySystemPrompt(),
    user: buildSummaryUserPrompt(life, closedBeat),
    schema: summaryLlmSchema,
    maxRetries: 1,
  });

  return { ...life, summary: result.summary };
}

export async function advanceTurn(
  id: string,
  playerInput: PlayerInput,
): Promise<LifeRecord> {
  const life = await readLife(id);

  if (life.meta.status === "dead") {
    throw new Error("此世已终结，无法继续推进。请开启新一世。");
  }

  const last = life.events[life.events.length - 1];
  if (!last) {
    throw new Error("存档损坏：没有事件");
  }
  if (last.playerInput) {
    throw new Error("上一事件已有玩家输入，存档状态异常。请重新读档。");
  }

  // Work on a copy; only write after successful LLM
  const working: LifeRecord = structuredClone(life);
  working.events[working.events.length - 1] = {
    ...last,
    playerInput,
  };

  const turnResult: TurnLlmResult = await callLlmJson({
    system: buildTurnSystemPrompt(),
    user: buildTurnUserPrompt(working, playerInput),
    schema: turnLlmSchema,
    maxRetries: 1,
  });

  let nextState = applyStateDelta(
    working.state,
    turnResult.stateDelta,
    turnResult.ageAdvance,
  );

  const died = Boolean(turnResult.death?.died);
  if (died) {
    working.meta.status = "dead";
    working.meta.endedAt = new Date().toISOString();
    if (turnResult.death?.cause) {
      nextState.flags = {
        ...nextState.flags,
        deathCause: turnResult.death.cause,
      };
    }
  }

  working.state = nextState;

  const newEvent: LifeEvent = {
    turn: last.turn + 1,
    age: nextState.age,
    narrative: turnResult.narrative,
    ui: died
      ? { type: "none", prompt: turnResult.ui.prompt ?? "此世已终" }
      : turnResult.ui,
    stateDelta: turnResult.stateDelta,
    playerInput: null,
    death: turnResult.death,
  };

  working.events.push(newEvent);

  const maybeSummarized = await maybeUpdateMemoryCard(working);
  await writeLife(maybeSummarized);
  return maybeSummarized;
}
