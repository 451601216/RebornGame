"use client";

import { useState } from "react";
import type { LifeEvent } from "@/lib/game/types";

type Props = {
  events: LifeEvent[];
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function EventTimeline({ events }: Props) {
  const [open, setOpen] = useState(false);
  if (events.length <= 1) return null;

  const past = events.slice(0, -1).slice(-12).reverse();

  return (
    <details
      className="event-timeline"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>本世前情（{events.length - 1}）</summary>
      <ol>
        {past.map((ev) => (
          <li key={ev.turn}>
            <span className="timeline-turn">
              第 {ev.turn} 拍 · {ev.age} 岁
            </span>
            <p>{truncate(ev.narrative, 72)}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
