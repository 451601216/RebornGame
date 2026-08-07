export const MIND_KEYS = [
  "执念",
  "清明",
  "嗔恨",
  "贪恋",
  "畏惧",
  "慈悲",
] as const;

export type MindKey = (typeof MIND_KEYS)[number];

export type MindState = Record<MindKey, number>;

export type MindDimension = {
  key: MindKey;
  /** 侧栏一行文言释义 */
  blurb: string;
  /** 写入 LLM prompt 的心理判定说明 */
  psychHint: string;
};

export const MIND_DIMENSIONS: readonly MindDimension[] = [
  {
    key: "执念",
    blurb: "固着反刍",
    psychHint:
      "认知固着/反刍/执取：反复纠结、无法放下旧目标或旧恨则升高；能放下、改道、接受损失则降低",
  },
  {
    key: "清明",
    blurb: "觉察不自欺",
    psychHint:
      "元认知觉察/正念清晰度：看清动机与后果、不自欺则升高；冲动、迷茫、合理化自我欺骗则降低",
  },
  {
    key: "嗔恨",
    blurb: "敌意阴影",
    psychHint:
      "敌意/愤怒与阴影攻击面：报复欲、迁怒、关系撕裂则升高；宽恕、克制攻击、和解则降低",
  },
  {
    key: "贪恋",
    blurb: "渴求依恋",
    psychHint:
      "渴求/依恋焦虑：占有、依赖、怕失去则升高；边界清晰、能独处则降低",
  },
  {
    key: "畏惧",
    blurb: "威胁回避",
    psychHint:
      "威胁敏感/回避焦虑：退缩、灾难化、不敢选择则升高；敢于面对不确定则降低",
  },
  {
    key: "慈悲",
    blurb: "共情利他",
    psychHint:
      "共情与亲社会动机：利他、体谅他者痛苦则升高；冷漠、工具化他人则降低",
  },
] as const;

/** 旧档缺维时的中性默认；执念/清明也给兜底，读档时保留已有值 */
export const DEFAULT_MIND: MindState = {
  执念: 30,
  清明: 35,
  嗔恨: 25,
  贪恋: 25,
  畏惧: 25,
  慈悲: 40,
};

export function clampMindValue(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function clampMind(mind: MindState): MindState {
  const out = { ...mind };
  for (const key of MIND_KEYS) {
    out[key] = clampMindValue(out[key]);
  }
  return out;
}

/**
 * 归一化为固定六维：缺键补默认、裁剪 0–100、丢弃未知键。
 */
export function normalizeMind(raw: unknown): MindState {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const out = { ...DEFAULT_MIND };
  for (const key of MIND_KEYS) {
    const v = src[key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      out[key] = clampMindValue(v);
    } else if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) out[key] = clampMindValue(n);
    }
  }
  return out;
}

export function mindPromptBlock(): string {
  return MIND_DIMENSIONS.map(
    (d) => `- ${d.key}（${d.blurb}）：${d.psychHint}`,
  ).join("\n");
}

export function mindExampleJson(): string {
  return JSON.stringify(DEFAULT_MIND);
}
