import { callLlmJson } from "@/lib/llm/client";
import {
  buildSummaryUserPrompt,
  buildTurnUserPrompt,
  shouldUpdateMemoryCard,
} from "./contextBuilder";
import { evaluateLifeEnd } from "./lifeEndGate";
import {
  listPastProfiles,
  nextLifeId,
  readLife,
  writeLife,
} from "./lifeStore";
import {
  formatMemoryCard,
  getThemeProgress,
  mergeMemoryCardProgress,
  parseMemoryCardText,
} from "./memoryCard";
import { normalizeMind } from "./mind";
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
import { bumpSoulLifeCount, mergeSoulAfterLife } from "./soulExtract";
import { readSoul, writeSoul } from "./soulStore";
import { applyStateDelta } from "./stateMerge";
import type {
  LifeEnding,
  LifeEvent,
  LifeRecord,
  PlayerInput,
  ProfileFingerprint,
} from "./types";

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

function isLifeEnded(status: LifeRecord["meta"]["status"]): boolean {
  return status === "dead" || status === "cleared";
}

export async function createNewLife(): Promise<LifeRecord> {
  const past = await listPastProfiles();
  const soul = await readSoul();
  let rejectReason = "";
  let generated: NewLifeLlmResult | null = null;

  for (let attempt = 0; attempt <= NEW_LIFE_SIM_RETRIES; attempt++) {
    const user =
      buildNewLifeUserPrompt(past, soul) +
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
  const initialMind = normalizeMind(state.mind);

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
    initialMind,
  };

  await writeLife(life);
  await writeSoul(bumpSoulLifeCount(soul));
  return life;
}

/**
 * 用「旧记忆卡 + 刚结束的一拍」轻量更新；并对 themeProgress 做单步 clamp。
 */
async function maybeUpdateMemoryCard(life: LifeRecord): Promise<LifeRecord> {
  if (!shouldUpdateMemoryCard(life.events.length)) return life;

  const closedBeat =
    life.events.length >= 2
      ? life.events[life.events.length - 2]
      : life.events[life.events.length - 1];
  if (!closedBeat) return life;

  const previousSummary = life.summary;
  const result = await callLlmJson({
    system: buildSummarySystemPrompt(),
    user: buildSummaryUserPrompt(life, closedBeat),
    schema: summaryLlmSchema,
    maxRetries: 1,
  });

  const parsed = parseMemoryCardText(result.summary);
  const summary = parsed
    ? formatMemoryCard(mergeMemoryCardProgress(previousSummary, parsed))
    : result.summary;

  return { ...life, summary };
}

export async function advanceTurn(
  id: string,
  playerInput: PlayerInput,
): Promise<LifeRecord> {
  const life = await readLife(id);

  if (isLifeEnded(life.meta.status)) {
    throw new Error("此世已终结，无法继续推进。请开启新一世。");
  }

  const last = life.events[life.events.length - 1];
  if (!last) {
    throw new Error("存档损坏：没有事件");
  }
  if (last.playerInput) {
    throw new Error("上一事件已有玩家输入，存档状态异常。请重新读档。");
  }

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

  const nextState = applyStateDelta(
    working.state,
    turnResult.stateDelta,
    turnResult.ageAdvance,
  );
  working.state = nextState;

  const newEvent: LifeEvent = {
    turn: last.turn + 1,
    age: nextState.age,
    narrative: turnResult.narrative,
    ui: turnResult.ui,
    stateDelta: turnResult.stateDelta,
    playerInput: null,
  };
  working.events.push(newEvent);

  let maybeSummarized = await maybeUpdateMemoryCard(working);

  const soul = await readSoul();
  const themeProgress = getThemeProgress(maybeSummarized.summary);
  const end = evaluateLifeEnd({
    state: maybeSummarized.state,
    themeProgress,
    turnCount: maybeSummarized.events.length,
    soul,
  });

  if (end.ended) {
    const ending: LifeEnding = {
      type: end.type,
      cause: end.cause,
      epilogue: turnResult.narrative,
    };
    maybeSummarized = {
      ...maybeSummarized,
      meta: {
        ...maybeSummarized.meta,
        status: end.type === "enlightenment" ? "cleared" : "dead",
        endedAt: new Date().toISOString(),
      },
      state: {
        ...maybeSummarized.state,
        flags: {
          ...maybeSummarized.state.flags,
          endingType: end.type,
          endingCause: end.cause,
        },
      },
      events: maybeSummarized.events.map((ev, i, arr) =>
        i === arr.length - 1
          ? {
              ...ev,
              ui: { type: "none", prompt: end.cause },
              ending,
              // 兼容旧 UI 读 death
              death:
                end.type === "death"
                  ? { died: true, cause: end.cause, epilogue: ending.epilogue }
                  : undefined,
            }
          : ev,
      ),
    };

    const nextSoul = mergeSoulAfterLife(soul, maybeSummarized, ending);
    await writeSoul(nextSoul);
  }

  await writeLife(maybeSummarized);
  return maybeSummarized;
}
