"use client";

import {
  getThemeProgress,
  getThemeStage,
  parseMemoryCardText,
} from "@/lib/game/memoryCard";
import { MIND_DIMENSIONS, normalizeMind } from "@/lib/game/mind";
import type { LifeRecord } from "@/lib/game/types";
import Link from "next/link";

type Props = {
  life: LifeRecord;
  onNewLife: () => void;
  onHome: () => void;
  disabled?: boolean;
};

function statusLabel(life: LifeRecord): string {
  if (life.meta.status === "cleared") return "炼心圆满 · 通关";
  const progress = getThemeProgress(life.summary);
  if (progress < 40) return "心路未休";
  return "尘归尘";
}

export function LifeSummaryScreen({
  life,
  onNewLife,
  onHome,
  disabled,
}: Props) {
  const ending =
    life.events[life.events.length - 1]?.ending ??
    (life.events[life.events.length - 1]?.death?.died
      ? {
          type: "death" as const,
          cause: life.events[life.events.length - 1]?.death?.cause || "身尽",
          epilogue: life.events[life.events.length - 1]?.death?.epilogue,
        }
      : null);

  const cleared = life.meta.status === "cleared";
  const title = statusLabel(life);
  const themeProgress = getThemeProgress(life.summary);
  const themeStage = getThemeStage(life.summary);
  const card = parseMemoryCardText(life.summary);
  const initial = normalizeMind(life.initialMind ?? life.state.mind);
  const finalMind = normalizeMind(life.state.mind);

  return (
    <section className={`life-summary ${cleared ? "life-summary-clear" : ""}`}>
      <p className="eyebrow">{cleared ? "通关" : "一世终"}</p>
      <h2>{title}</h2>
      <p className="life-summary-cause">{ending?.cause || "此世已终"}</p>
      {ending?.epilogue ? (
        <p className="life-summary-epilogue">{ending.epilogue}</p>
      ) : null}

      <dl className="life-summary-meta">
        <div>
          <dt>姓名</dt>
          <dd>
            {life.profile.name} · {life.profile.era}
          </dd>
        </div>
        <div>
          <dt>寿数</dt>
          <dd>
            {life.state.age} 岁 · {life.events.length} 拍
          </dd>
        </div>
        <div>
          <dt>课题</dt>
          <dd>
            {life.profile.themeHook} · {themeStage}（{themeProgress}%）
          </dd>
        </div>
      </dl>

      {card?.unfinished && card.unfinished.length > 0 && !cleared ? (
        <div className="life-summary-block">
          <h3>未竟之事</h3>
          <ul>
            {card.unfinished.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {card?.milestones && card.milestones.length > 0 ? (
        <div className="life-summary-block">
          <h3>里程碑</h3>
          <ul>
            {card.milestones.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="life-summary-block">
        <h3>心性对照</h3>
        <ul className="mind-compare">
          {MIND_DIMENSIONS.map(({ key }) => {
            const a = initial[key];
            const b = finalMind[key];
            const d = b - a;
            return (
              <li key={key}>
                <span>{key}</span>
                <span>
                  {a} → {b}
                </span>
                <strong className={d > 0 ? "up" : d < 0 ? "down" : ""}>
                  {d > 0 ? `+${d}` : d}
                </strong>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="life-summary-actions">
        {cleared ? (
          <p className="muted">已通轮回。仍可继续体验他世，或先回看灵识。</p>
        ) : null}
        <button
          type="button"
          className="primary-btn"
          disabled={disabled}
          onClick={onNewLife}
        >
          开启下一世
        </button>
        <Link href="/soul" className="ghost-btn link-btn">
          查看灵识
        </Link>
        <button type="button" className="ghost-btn" onClick={onHome}>
          回首页
        </button>
      </div>
    </section>
  );
}
