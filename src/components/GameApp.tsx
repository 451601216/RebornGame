"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EventActionPanel } from "@/components/EventActionPanel";
import { NarrativeView } from "@/components/NarrativeView";
import { StatePanel } from "@/components/StatePanel";
import type { LifeListItem, LifeRecord, PlayerInput } from "@/lib/game/types";

type View = "home" | "play";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `请求失败 (${res.status})`;
  } catch {
    return `请求失败 (${res.status})`;
  }
}

export function GameApp() {
  const [view, setView] = useState<View>("home");
  const [lives, setLives] = useState<LifeListItem[]>([]);
  const [life, setLife] = useState<LifeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    refreshList()
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBootLoading(false));
  }, [refreshList]);

  async function startNewLife() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/life", { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { life: LifeRecord };
      setLife(data.life);
      setView("play");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function continueLife(id: string) {
    setLoading(true);
    setError(null);
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
    try {
      const res = await fetch(`/api/life/${life.id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerInput: input }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { life: LifeRecord };
      setLife(data.life);
      await refreshList();
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
  }

  if (view === "play" && life && currentEvent) {
    const dead = life.meta.status === "dead";
    return (
      <div className="shell">
        <header className="topbar">
          <button type="button" className="ghost-btn" onClick={backHome}>
            返回
          </button>
          <div className="brand-mini">轮回炼心 · {life.id}</div>
          <div className="topbar-status">{dead ? "已终" : "在世"}</div>
        </header>
        <div className="play-grid">
          <main className="play-main">
            <NarrativeView
              narrative={currentEvent.narrative}
              epilogue={currentEvent.death?.epilogue}
              ui={currentEvent.ui}
            />
            {loading ? (
              <p className="loading-text">命运编织中…</p>
            ) : (
              <EventActionPanel
                ui={currentEvent.ui}
                disabled={loading}
                dead={dead}
                onSubmit={submitTurn}
                onReincarnate={startNewLife}
              />
            )}
            {error ? <p className="error-text">{error}</p> : null}
          </main>
          <StatePanel life={life} />
        </div>
      </div>
    );
  }

  return (
    <div className="shell home-shell">
      <header className="hero">
        <p className="eyebrow">文字轮回</p>
        <h1>轮回炼心</h1>
        <p className="lede">
          每一世从出生到死亡，皆由命运之书写就。选择、填空、承受——在轮回中炼心。
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="primary-btn"
            disabled={loading || bootLoading}
            onClick={startNewLife}
          >
            {loading ? "命运编织中…" : "开启新一世"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </header>

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
                  {item.status === "dead" ? "已终" : `在世 · ${item.age} 岁`} ·{" "}
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
