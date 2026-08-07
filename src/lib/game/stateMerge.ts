import {
  MIND_KEYS,
  clampMindValue,
  normalizeMind,
  type MindKey,
  type MindState,
} from "./mind";
import type { LifeState } from "./types";

function setPath(obj: Record<string, unknown>, pathKey: string, value: unknown): void {
  const parts = pathKey.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cur[key];
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (key.includes(".")) {
      setPath(out, key, value);
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof out[key] === "object" &&
      out[key] !== null &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(
        out[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

function parseDeltaNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/**
 * 从 stateDelta 抽出心性相对增减，避免 deepMerge 把 mind 当绝对值覆盖。
 */
function extractMindDelta(delta: Record<string, unknown> | undefined): {
  cleanDelta: Record<string, unknown>;
  mindDelta: Partial<Record<MindKey, number>>;
} {
  const cleanDelta: Record<string, unknown> = {};
  const mindDelta: Partial<Record<MindKey, number>> = {};

  if (!delta) return { cleanDelta, mindDelta };

  for (const [key, value] of Object.entries(delta)) {
    if (key === "mind") {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [mk, mv] of Object.entries(value as Record<string, unknown>)) {
          if ((MIND_KEYS as readonly string[]).includes(mk)) {
            const n = parseDeltaNumber(mv);
            if (n !== null) mindDelta[mk as MindKey] = n;
          }
        }
      }
      continue;
    }

    if (key.startsWith("mind.")) {
      const mk = key.slice("mind.".length);
      if ((MIND_KEYS as readonly string[]).includes(mk)) {
        const n = parseDeltaNumber(value);
        if (n !== null) mindDelta[mk as MindKey] = n;
      }
      continue;
    }

    cleanDelta[key] = value;
  }

  return { cleanDelta, mindDelta };
}

function applyMindRelativeDelta(
  current: unknown,
  mindDelta: Partial<Record<MindKey, number>>,
): MindState {
  const base = normalizeMind(current);
  const out = { ...base };
  for (const key of MIND_KEYS) {
    const d = mindDelta[key];
    if (typeof d === "number" && !Number.isNaN(d)) {
      out[key] = clampMindValue(base[key] + d);
    }
  }
  return out;
}

export function applyStateDelta(
  state: LifeState,
  delta: Record<string, unknown> | undefined,
  ageAdvance?: number,
): LifeState {
  const { cleanDelta, mindDelta } = extractMindDelta(delta);
  const base = structuredClone(state) as unknown as Record<string, unknown>;
  const merged = deepMerge(base, cleanDelta) as unknown as LifeState;

  if (typeof ageAdvance === "number" && ageAdvance > 0) {
    merged.age = (typeof merged.age === "number" ? merged.age : state.age) + ageAdvance;
  }

  if (typeof merged.age !== "number" || Number.isNaN(merged.age)) {
    merged.age = state.age;
  }
  merged.age = Math.max(0, Math.min(120, Math.round(merged.age)));

  if (typeof merged.health !== "number" || Number.isNaN(merged.health)) {
    merged.health = state.health;
  }
  merged.health = Math.max(0, Math.min(100, Math.round(merged.health)));

  merged.mind = applyMindRelativeDelta(state.mind, mindDelta);

  if (!Array.isArray(merged.inventory)) {
    merged.inventory = [...state.inventory];
  }
  if (!Array.isArray(merged.relationships)) {
    merged.relationships = [...state.relationships];
  }
  if (!merged.flags || typeof merged.flags !== "object") {
    merged.flags = { ...state.flags };
  }
  if (typeof merged.location !== "string" || !merged.location) {
    merged.location = state.location;
  }

  return merged;
}
