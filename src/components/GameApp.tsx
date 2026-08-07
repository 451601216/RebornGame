"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EventActionPanel } from "@/components/EventActionPanel";
import { EventTimeline } from "@/components/EventTimeline";
import { FateLoading } from "@/components/FateLoading";
import { LifeSummaryScreen } from "@/components/LifeSummaryScreen";
import {
  diffMind,
  MindDeltaToast,
  type MindDeltaItem,
} from "@/components/MindDeltaToast";
import { NarrativeView } from "@/components/NarrativeView";
import { StatePanel } from "@/components/StatePanel";
import type {
  LifeListItem,
  LifeRecord,
  PlayerInput,
  SoulRecord,
} from "@/lib/game/types";
import Link from "next/link";

type View = "home" | "play";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `请求失败 (${res.status})`;
  } catch {
    return `请求失败 (${res.status})`;
  }
}

function lifeEnded(life: LifeRecord): boolean {
  return life.meta.status === "dead" || life.meta.status === "cleared";
}

function statusText(status: LifeListItem["status"]): string {
  if (status === "cleared") return "圆满";
  if (status === "dead") return "已终";
  return "在世";
}

export function GameApp() {
  const [view, setView] = useState<View>("home");
  const [lives, setLives] = useState<LifeListItem[]>([]);
  const [soul, setSoul] = useState<SoulRecord | null>(null);
  const [life, setLife] = useState<LifeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindDeltas, setMindDeltas] = useState<MindDeltaItem[]>([]);
  const [bondToast, setBondToast] = useState<string | null>(null);

  const currentEvent = useMemo(() => {
    if (!life || life.events.length === 0) return null;
    return life.events[life.events.length - 1]!;
  }, [life]);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/life");
    if (!res.ok) throw new Error(await readError(res));
    const data = (await res.json()) as { lives: LifeListItem[] };
    setLives(data.lives);
  }, []);

  const refreshSoul = useCallback(async () => {
    const res = await fetch("/api/soul");
    if (!res.ok) return;
    const data = (await res.json()) as { soul: SoulRecord };
    setSoul(data.soul);
  }, []);

  useEffect(() => {
    Promise.all([refreshList(), refreshSoul()])
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBootLoading(false));
  }, [refreshList, refreshSoul]);

  useEffect(() => {
    if (!bondToast) return;
    const t = window.setTimeout(() => setBondToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [bondToast]);

  async function startNewLife() {
    setLoading(true);
    setError(null);
    setMindDeltas([]);
    try {
      const res = await fetch("/api/life", { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { life: LifeRecord };
      setLife(data.life);
      setView("play");
      await Promise.all([refreshList(), refreshSoul()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function continueLife(id: string) {
    setLoading(true);
    setError(null);
    setMindDeltas([]);
    try {
      const res = await fetch(`/api/life/${id}`);
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { life: LifeRecord };
      setLife(data.life);
      setView("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitTurn(input: PlayerInput) {
    if (!life) return;
    setLoading(true);
    setError(null);
    const prevMind = life.state.mind;
    const prevBondCount = soul?.bonds.length ?? 0;
    const prevRelicCount = soul?.relics.length ?? 0;
    try {
      const res = await fetch(`/api/life/${life.id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerInput: input }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { life: LifeRecord };
      setMindDeltas(diffMind(prevMind, data.life.state.mind));
      setLife(data.life);
      await Promise.all([refreshList(), refreshSoul()]);

      // 结算后检测新羁绊（soul 刷新后再读）
      const soulRes = await fetch("/api/soul");
      if (soulRes.ok) {
        const soulData = (await soulRes.json()) as { soul: SoulRecord };
        setSoul(soulData.soul);
        if (soulData.soul.bonds.length > prevBondCount) {
          const newest = soulData.soul.bonds[0];
          if (newest) setBondToast(`羁绊记入灵识：${newest.name}`);
        } else if (soulData.soul.relics.length > prevRelicCount) {
          const newest = soulData.soul.relics[0];
          if (newest) setBondToast(`念物记入灵识：${newest.name}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function backHome() {
    setView("home");
    setLife(null);
    setError(null);
    setMindDeltas([]);
  }

  if (view === "play" && life && currentEvent) {
    const ended = lifeEnded(life);
    const epilogue =
      currentEvent.ending?.epilogue ?? currentEvent.death?.epilogue;
    const cause = currentEvent.ending?.cause ?? currentEvent.death?.cause;

    return (
      <div className="shell">
        <header className="topbar">
          <button type="button" className="ghost-btn" onClick={backHome}>
            返回
          </button>
          <div className="brand-mini">轮回炼心 · {life.id}</div>
          <div className="topbar-status">
            {life.meta.status === "cleared"
              ? "圆满"
              : ended
                ? "已终"
                : "在世"}
          </div>
        </header>
        <div className="play-grid">
          <main className="play-main">
            <MindDeltaToast
              items={mindDeltas}
              onDone={() => setMindDeltas([])}
            />
            {bondToast ? (
              <div className="bond-toast" role="status">
                {bondToast}
              </div>
            ) : null}
            {ended ? (
              <LifeSummaryScreen
                life={life}
                onNewLife={startNewLife}
                onHome={backHome}
                disabled={loading}
              />
            ) : (
              <>
                <NarrativeView
                  narrative={currentEvent.narrative}
                  epilogue={epilogue}
                  cause={cause}
                  ui={currentEvent.ui}
                />
                {loading ? (
                  <FateLoading label="命运编织中" />
                ) : (
                  <EventActionPanel
                    ui={currentEvent.ui}
                    disabled={loading}
                    dead={false}
                    onSubmit={submitTurn}
                    onReincarnate={startNewLife}
                  />
                )}
                <EventTimeline events={life.events} />
              </>
            )}
            {error ? <p className="error-text">{error}</p> : null}
          </main>
          <StatePanel life={life} />
        </div>
      </div>
    );
  }

  const essencePreview = soul?.essence
    ? soul.essence.length > 48
      ? `${soul.essence.slice(0, 48)}…`
      : soul.essence
    : "灵识初醒，尚未留下轮回痕迹。";

  return (
    <div className="shell home-shell">
      <header className="hero">
        <p className="eyebrow">文字轮回</p>
        <h1>轮回炼心</h1>
        <p className="lede">
          每一世从出生到死亡，皆由命运之书写就。选择、填空、承受——在轮回中炼心。
        </p>
        <div className="hero-actions">
          {loading ? (
            <FateLoading label="命运编织中" compact />
          ) : (
            <button
              type="button"
              className="primary-btn"
              disabled={bootLoading}
              onClick={startNewLife}
            >
              开启新一世
            </button>
          )}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </header>

      <Link href="/soul" className="soul-entry-card">
        <div>
          <p className="eyebrow">灵识</p>
          <h2>
            已历 {soul?.stats.totalLives ?? 0} 世
            {soul?.gameCleared ? " · 已通关" : ""}
          </h2>
          <p className="soul-entry-preview">{essencePreview}</p>
        </div>
        <span className="soul-entry-arrow">查看 →</span>
      </Link>

      <section className="save-list">
        <h2>既有轮回</h2>
        {bootLoading ? <p className="muted">读取存档…</p> : null}
        {!bootLoading && lives.length === 0 ? (
          <p className="muted">尚无存档。开启第一世吧。</p>
        ) : null}
        <ul>
          {lives.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="save-card"
                disabled={loading}
                onClick={() => continueLife(item.id)}
              >
                <span className="save-id">{item.id}</span>
                <span className="save-name">
                  {item.name} · {item.era}
                </span>
                <span className="save-meta">
                  {statusText(item.status)}
                  {item.status === "alive" ? ` · ${item.age} 岁` : ""} ·{" "}
                  {item.themeHook}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
