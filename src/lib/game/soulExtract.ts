import { MIND_KEYS, type MindKey } from "./mind";
import { getThemeProgress, parseMemoryCardText } from "./memoryCard";
import type {
  BondCharacter,
  BondRelic,
  LifeEnding,
  LifeRecord,
  SoulRecord,
} from "./types";

/** 羁绊人物：极深缘分门槛（非普通关系） */
const BOND_THRESHOLD = 90;
/** 羁绊道具：须有明确信物标记，或极高课题 + 随身物 */
const RELIC_THEME_FLOOR = 75;
const MIN_LIFE_TURNS = 10;
const MAX_BONDS = 24;
const MAX_RELICS = 24;
const NEAR_ENLIGHTENMENT = 90;

/** 硬门槛通过后，再以确定性哈希决定是否入库（约几世一遇） */
const BOND_ROLL_PASS = 28; // ~28% → 约 3–4 世一次（在达标前提下）
const RELIC_ROLL_PASS = 18; // 更稀有

function stableHash(...parts: string[]): number {
  const raw = parts.join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return h;
}

function stableId(...parts: string[]): string {
  return `b${stableHash(...parts).toString(16)}`;
}

/** 0–99 的确定性掷骰，同 lifeId 结果稳定 */
function lifeRoll(lifeId: string, salt: string): number {
  return stableHash(lifeId, salt) % 100;
}

function mentionedInMilestones(name: string, milestones: string[]): boolean {
  return milestones.some((m) => m.includes(name));
}

function pickBondCharacter(life: LifeRecord): BondCharacter | null {
  if (life.events.length < MIN_LIFE_TURNS) return null;
  if (lifeRoll(life.id, "bond") >= BOND_ROLL_PASS) return null;

  const card = parseMemoryCardText(life.summary);
  const milestones = card?.milestones ?? [];
  const themeProgress = getThemeProgress(life.summary);
  if (themeProgress < 45) return null;

  const sorted = [...life.state.relationships].sort((a, b) => b.bond - a.bond);
  const top = sorted.find(
    (r) =>
      r.bond >= BOND_THRESHOLD &&
      Boolean(card?.people?.includes(r.name)) &&
      mentionedInMilestones(r.name, milestones),
  );
  if (!top) return null;

  const epithet = card?.people
    ?.split(/[／/]/)
    .find((p) => p.includes(top.name))
    ?.replace(/\(\d+\)/, "")
    .trim();

  return {
    id: stableId(life.id, top.name),
    name: top.name,
    epithet: epithet && epithet !== top.name ? epithet : undefined,
    originLifeId: life.id,
    originEra: life.profile.era,
    bondPeak: top.bond,
    memory: `在「${life.profile.themeHook}」一途中，与 ${top.name} 结下深缘。`,
    relationship: undefined,
  };
}

function pickRelic(life: LifeRecord): BondRelic | null {
  if (life.events.length < MIN_LIFE_TURNS) return null;

  const keepsakeFlag = Object.entries(life.state.flags).find(
    ([k, v]) => k.startsWith("keepsake:") && Boolean(v),
  );

  // 显式信物仍要过稀有掷骰；普通随身物门槛更高
  if (keepsakeFlag) {
    if (lifeRoll(life.id, "relic-keepsake") >= RELIC_ROLL_PASS + 12) return null;
    const name = keepsakeFlag[0].slice("keepsake:".length) || "信物";
    return {
      id: stableId(life.id, "relic", name),
      name,
      originLifeId: life.id,
      originEra: life.profile.era,
      memory: `自「${life.profile.era}」一世携来的念物。`,
    };
  }

  if (lifeRoll(life.id, "relic") >= RELIC_ROLL_PASS) return null;

  const themeProgress = getThemeProgress(life.summary);
  if (themeProgress < RELIC_THEME_FLOOR) return null;

  const hasDeepBond = life.state.relationships.some((r) => r.bond >= BOND_THRESHOLD);
  if (!hasDeepBond) return null;

  const item = life.state.inventory[0];
  if (!item) return null;

  return {
    id: stableId(life.id, "relic", item),
    name: item,
    originLifeId: life.id,
    originEra: life.profile.era,
    memory: `伴随「${life.profile.name}」走过半生的物件。`,
  };
}

function updateMindImprint(
  imprint: Partial<Record<MindKey, number>>,
  mind: LifeRecord["state"]["mind"],
): Partial<Record<MindKey, number>> {
  const out = { ...imprint };
  for (const key of MIND_KEYS) {
    const v = mind[key];
    if (typeof v === "number" && (out[key] === undefined || v > (out[key] ?? 0))) {
      out[key] = v;
    }
  }
  return out;
}

function buildEssence(life: LifeRecord, ending: LifeEnding, soul: SoulRecord): string {
  const progress = getThemeProgress(life.summary);
  const stage = parseMemoryCardText(life.summary)?.themeStage || "课题未明";
  const lives = soul.stats.totalLives;
  if (ending.type === "enlightenment") {
    return `历经 ${lives} 世轮回，终在「${life.profile.themeHook}」一途上炼心圆满。灵识澄明，尘缘可放。`;
  }
  const near =
    progress >= NEAR_ENLIGHTENMENT
      ? "几乎触及圆满之境，却仍差一线。"
      : `课题停在「${stage}」。`;
  return `已历 ${lives} 世。最近一世为${life.profile.era}之${life.profile.name}，修「${life.profile.themeHook}」，${near}`;
}

/**
 * 当世结束后合并更新 Soul。
 * 羁绊人物/道具为小概率：硬门槛 + 确定性稀有掷骰，预期几世才记入一条；
 * 同一世优先人物，已记人物则本世不再记道具（圆满除外）。
 */
export function mergeSoulAfterLife(
  soul: SoulRecord,
  life: LifeRecord,
  ending: LifeEnding,
): SoulRecord {
  const themeProgress = getThemeProgress(life.summary);
  const next: SoulRecord = structuredClone(soul);

  next.stats.totalTurns += life.events.length;
  if (ending.type === "death") {
    next.stats.deaths += 1;
    if (themeProgress >= NEAR_ENLIGHTENMENT) {
      next.stats.nearEnlightenment += 1;
    }
  }

  if (ending.type === "enlightenment") {
    next.gameCleared = true;
    next.clearedAt = new Date().toISOString();
    next.clearedLifeId = life.id;
  }

  next.mindImprint = updateMindImprint(next.mindImprint, life.state.mind);

  const existingThreadIdx = next.themeThreads.findIndex((t) => t.lifeId === life.id);
  const thread = {
    hook: life.profile.themeHook,
    lifeId: life.id,
    progress: themeProgress,
    resolved: themeProgress >= 95 || ending.type === "enlightenment",
  };
  if (existingThreadIdx >= 0) {
    next.themeThreads[existingThreadIdx] = thread;
  } else {
    next.themeThreads.push(thread);
  }

  const bond = pickBondCharacter(life);
  let bondedThisLife = false;
  if (bond && !next.bonds.some((b) => b.id === bond.id)) {
    next.bonds = [bond, ...next.bonds].slice(0, MAX_BONDS);
    bondedThisLife = true;
  }

  // 同世一般不同时掉人物+道具；圆满世可两者都尝试
  if (!bondedThisLife || ending.type === "enlightenment") {
    const relic = pickRelic(life);
    if (relic && !next.relics.some((r) => r.id === relic.id)) {
      next.relics = [relic, ...next.relics].slice(0, MAX_RELICS);
    }
  }

  next.essence = buildEssence(life, ending, next);
  next.lastUpdated = new Date().toISOString();
  return next;
}

/** 开新世时增加 totalLives */
export function bumpSoulLifeCount(soul: SoulRecord): SoulRecord {
  return {
    ...soul,
    stats: {
      ...soul.stats,
      totalLives: soul.stats.totalLives + 1,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/** 开世 prompt 用的轻量遗产摘要（不含人物姓名与事件） */
export function soulLegacyForPrompt(soul: SoulRecord): {
  essence: string;
  totalLives: number;
  gameCleared: boolean;
  unfinishedTheme?: { hook: string; progress: number };
} {
  const unfinished = [...soul.themeThreads]
    .filter((t) => !t.resolved)
    .sort((a, b) => b.progress - a.progress)[0];

  return {
    essence: soul.essence,
    totalLives: soul.stats.totalLives,
    gameCleared: soul.gameCleared,
    unfinishedTheme: unfinished
      ? { hook: unfinished.hook, progress: unfinished.progress }
      : undefined,
  };
}
