import { z } from "zod";

const THEME_PROGRESS_STEP = 10;

/** 结构化记忆卡（摘要主记忆） */
export type MemoryCard = {
  /** 身份锚点：出身/阶层一句话 */
  anchor: string;
  /** 未了之事，最多 3 条 */
  unfinished: string[];
  /** 关键人物：名(bond)／… */
  people: string;
  /** 心性趋势：只写有变化的维 */
  mindTrend: string;
  /** 禁忌重复，可选 */
  avoid?: string;
  /** 一句文青主线，建议 ≤40 字 */
  thread: string;
  /** 炼心课题完成度 0–100 */
  themeProgress: number;
  /** 课题阶段文案 */
  themeStage: string;
  /** 本世关键节点，最多 5 条 */
  milestones: string[];
};

export const memoryCardSchema = z.object({
  anchor: z.string().min(1),
  unfinished: z.array(z.string().min(1)).max(3).default([]),
  people: z.string().default(""),
  mindTrend: z.string().default(""),
  avoid: z.string().optional(),
  thread: z.string().min(1),
  themeProgress: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return 0;
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return 0;
      return Math.max(0, Math.min(100, Math.round(n)));
    }),
  themeStage: z.string().optional().transform((v) => v?.trim() || "初识课题"),
  milestones: z
    .array(z.string().min(1))
    .max(5)
    .optional()
    .transform((v) => v ?? []),
});

export function formatMemoryCard(card: MemoryCard): string {
  const unfinished =
    card.unfinished.length > 0 ? card.unfinished.join("；") : "（暂无）";
  const milestones =
    card.milestones.length > 0 ? card.milestones.join("；") : "（暂无）";
  const lines = [
    `身份锚点: ${card.anchor}`,
    `未了之事: ${unfinished}`,
    `关键人物: ${card.people || "（暂无）"}`,
    `心性趋势: ${card.mindTrend || "（尚稳）"}`,
  ];
  if (card.avoid?.trim()) {
    lines.push(`禁忌重复: ${card.avoid.trim()}`);
  }
  lines.push(`主线: ${card.thread}`);
  lines.push(`课题进度: ${card.themeProgress}`);
  lines.push(`课题阶段: ${card.themeStage || "初识课题"}`);
  lines.push(`里程碑: ${milestones}`);
  return lines.join("\n");
}

/** 旧散文摘要或已是记忆卡文本，原样作为上下文；解析失败不抛错 */
export function memoryCardFromUnknown(raw: unknown): MemoryCard | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const parsed = memoryCardSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  return null;
}

function parseLabeledLine(text: string, label: string): string | null {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "m");
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

/** 从格式化文本反解析记忆卡（兼容旧档缺课题字段） */
export function parseMemoryCardText(text: string | undefined | null): MemoryCard | null {
  if (!text?.trim()) return null;

  const asObject = memoryCardFromUnknown(
    (() => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (asObject) return asObject;

  const anchor = parseLabeledLine(text, "身份锚点");
  const thread = parseLabeledLine(text, "主线");
  if (!anchor || !thread) return null;

  const unfinishedRaw = parseLabeledLine(text, "未了之事") || "";
  const unfinished =
    unfinishedRaw && unfinishedRaw !== "（暂无）"
      ? unfinishedRaw.split(/[；;]/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
      : [];

  const milestonesRaw = parseLabeledLine(text, "里程碑") || "";
  const milestones =
    milestonesRaw && milestonesRaw !== "（暂无）"
      ? milestonesRaw.split(/[；;]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : [];

  const progressRaw = parseLabeledLine(text, "课题进度");
  let themeProgress = 0;
  if (progressRaw) {
    const n = Number(progressRaw);
    if (!Number.isNaN(n)) themeProgress = Math.max(0, Math.min(100, Math.round(n)));
  }

  const avoid = parseLabeledLine(text, "禁忌重复") || undefined;

  return {
    anchor,
    unfinished,
    people: parseLabeledLine(text, "关键人物") || "",
    mindTrend: parseLabeledLine(text, "心性趋势") || "",
    avoid: avoid && avoid !== "（暂无）" ? avoid : undefined,
    thread,
    themeProgress,
    themeStage: parseLabeledLine(text, "课题阶段") || "初识课题",
    milestones,
  };
}

export function getThemeProgress(summary: string | undefined | null): number {
  return parseMemoryCardText(summary)?.themeProgress ?? 0;
}

export function getThemeStage(summary: string | undefined | null): string {
  return parseMemoryCardText(summary)?.themeStage || "初识课题";
}

/**
 * 合并新旧记忆卡，并对 themeProgress 做单步 clamp（|Δ|≤10）。
 */
export function mergeMemoryCardProgress(
  previousSummary: string | undefined | null,
  next: MemoryCard,
): MemoryCard {
  const prev = parseMemoryCardText(previousSummary);
  const prevProgress = prev?.themeProgress ?? 0;
  const rawNext = next.themeProgress;
  const delta = Math.max(
    -THEME_PROGRESS_STEP,
    Math.min(THEME_PROGRESS_STEP, rawNext - prevProgress),
  );
  return {
    ...next,
    themeProgress: Math.max(0, Math.min(100, Math.round(prevProgress + delta))),
    themeStage: next.themeStage?.trim() || prev?.themeStage || "初识课题",
    milestones: (next.milestones ?? []).slice(0, 5),
  };
}

export function coerceSummaryToText(raw: unknown): string {
  const card = memoryCardFromUnknown(raw);
  if (card) return formatMemoryCard(card);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
}

export function coerceSummaryWithProgressClamp(
  previousSummary: string | undefined | null,
  raw: unknown,
): string {
  const card = memoryCardFromUnknown(raw);
  if (!card) return coerceSummaryToText(raw);
  return formatMemoryCard(mergeMemoryCardProgress(previousSummary, card));
}
