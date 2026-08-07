import { promises as fs } from "fs";
import path from "path";
import type { SoulRecord } from "./types";

const SAVES_DIR = path.join(process.cwd(), "saves");
const SOUL_PATH = path.join(SAVES_DIR, "soul.json");

export function emptySoul(): SoulRecord {
  return {
    essence: "灵识初醒，尚未留下轮回痕迹。",
    gameCleared: false,
    stats: {
      totalLives: 0,
      totalTurns: 0,
      deaths: 0,
      nearEnlightenment: 0,
    },
    bonds: [],
    relics: [],
    mindImprint: {},
    themeThreads: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function ensureSavesDir(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
}

export async function readSoul(): Promise<SoulRecord> {
  await ensureSavesDir();
  try {
    const raw = await fs.readFile(SOUL_PATH, { encoding: "utf8" });
    const parsed = JSON.parse(raw) as SoulRecord;
    return {
      ...emptySoul(),
      ...parsed,
      stats: { ...emptySoul().stats, ...parsed.stats },
      bonds: Array.isArray(parsed.bonds) ? parsed.bonds : [],
      relics: Array.isArray(parsed.relics) ? parsed.relics : [],
      mindImprint: parsed.mindImprint ?? {},
      themeThreads: Array.isArray(parsed.themeThreads) ? parsed.themeThreads : [],
    };
  } catch {
    return emptySoul();
  }
}

export async function writeSoul(soul: SoulRecord): Promise<void> {
  await ensureSavesDir();
  const payload = {
    ...soul,
    lastUpdated: new Date().toISOString(),
  };
  const tmp = `${SOUL_PATH}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
  });
  await fs.rename(tmp, SOUL_PATH);
}
