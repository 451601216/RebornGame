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

export function applyStateDelta(
  state: LifeState,
  delta: Record<string, unknown> | undefined,
  ageAdvance?: number,
): LifeState {
  const base = structuredClone(state) as unknown as Record<string, unknown>;
  const merged = deepMerge(base, delta ?? {}) as unknown as LifeState;

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

  if (!merged.mind || typeof merged.mind !== "object") {
    merged.mind = { ...state.mind };
  }
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
