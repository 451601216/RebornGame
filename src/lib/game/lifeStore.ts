import { promises as fs } from "fs";
import path from "path";
import { normalizeMind } from "./mind";
import type { LifeListItem, LifeRecord, ProfileFingerprint } from "./types";

const SAVES_DIR = path.join(process.cwd(), "saves");

async function ensureSavesDir(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
}

function lifePath(id: string): string {
  if (!/^life-\d{3,}$/.test(id)) {
    throw new Error(`非法存档 id: ${id}`);
  }
  return path.join(SAVES_DIR, `${id}.json`);
}

function normalizeLifeRecord(life: LifeRecord): LifeRecord {
  return {
    ...life,
    state: {
      ...life.state,
      mind: normalizeMind(life.state?.mind),
    },
  };
}

export async function listLifeIds(): Promise<string[]> {
  await ensureSavesDir();
  const files = await fs.readdir(SAVES_DIR);
  return files
    .filter((f) => /^life-\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export async function nextLifeId(): Promise<string> {
  const ids = await listLifeIds();
  let max = 0;
  for (const id of ids) {
    const n = Number(id.replace("life-", ""));
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `life-${String(max + 1).padStart(3, "0")}`;
}

export async function writeLife(life: LifeRecord): Promise<void> {
  await ensureSavesDir();
  const normalized = normalizeLifeRecord(life);
  const target = lifePath(normalized.id);
  const tmp = `${target}.tmp`;
  const payload = `${JSON.stringify(normalized, null, 2)}\n`;
  await fs.writeFile(tmp, payload, { encoding: "utf8" });
  await fs.rename(tmp, target);
}

export async function readLife(id: string): Promise<LifeRecord> {
  const raw = await fs.readFile(lifePath(id), { encoding: "utf8" });
  return normalizeLifeRecord(JSON.parse(raw) as LifeRecord);
}

export async function listLives(): Promise<LifeListItem[]> {
  const ids = await listLifeIds();
  const items: LifeListItem[] = [];
  for (const id of ids) {
    try {
      const life = await readLife(id);
      items.push({
        id: life.id,
        status: life.meta.status,
        name: life.profile.name,
        era: life.profile.era,
        age: life.state.age,
        startedAt: life.meta.startedAt,
        endedAt: life.meta.endedAt,
        themeHook: life.profile.themeHook,
      });
    } catch {
      // skip corrupt files
    }
  }
  return items.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function listPastProfiles(): Promise<ProfileFingerprint[]> {
  const ids = await listLifeIds();
  const fingerprints: ProfileFingerprint[] = [];
  for (const id of ids) {
    try {
      const life = await readLife(id);
      fingerprints.push({
        id: life.id,
        era: life.profile.era,
        name: life.profile.name,
        background: life.profile.background,
        traits: life.profile.traits,
        themeHook: life.profile.themeHook,
        summaryTag: life.summary?.slice(0, 80) || undefined,
      });
    } catch {
      // skip
    }
  }
  return fingerprints;
}
