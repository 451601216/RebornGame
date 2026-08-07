"use client";

import { MIND_KEYS, type MindKey } from "@/lib/game/mind";
import { useEffect } from "react";

export type MindDeltaItem = { key: MindKey; delta: number };

type Props = {
  items: MindDeltaItem[];
  onDone: () => void;
};

export function MindDeltaToast({ items, onDone }: Props) {
  useEffect(() => {
    if (items.length === 0) return;
    const t = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(t);
  }, [items, onDone]);

  if (items.length === 0) return null;

  return (
    <div className="mind-delta-toast" role="status">
      {items.map(({ key, delta }) => (
        <span key={key} className={delta > 0 ? "up" : "down"}>
          {key} {delta > 0 ? `+${delta}` : delta}
        </span>
      ))}
    </div>
  );
}

export function diffMind(
  before: Partial<Record<MindKey, number>> | undefined,
  after: Partial<Record<MindKey, number>> | undefined,
): MindDeltaItem[] {
  const items: MindDeltaItem[] = [];
  for (const key of MIND_KEYS) {
    const a = before?.[key] ?? 0;
    const b = after?.[key] ?? 0;
    const d = b - a;
    if (d !== 0) items.push({ key, delta: d });
  }
  return items;
}
