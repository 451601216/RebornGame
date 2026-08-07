import { z } from "zod";

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
};

export const memoryCardSchema = z.object({
  anchor: z.string().min(1),
  unfinished: z
    .array(z.string().min(1))
    .max(3)
    .default([]),
  people: z.string().default(""),
  mindTrend: z.string().default(""),
  avoid: z.string().optional(),
  thread: z.string().min(1),
});

export function formatMemoryCard(card: MemoryCard): string {
  const unfinished =
    card.unfinished.length > 0 ? card.unfinished.join("；") : "（暂无）";
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

export function coerceSummaryToText(raw: unknown): string {
  const card = memoryCardFromUnknown(raw);
  if (card) return formatMemoryCard(card);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
}
