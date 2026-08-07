"use client";

import { useEffect, useState } from "react";
import type { SoulRecord } from "@/lib/game/types";
import Link from "next/link";
import { FateLoading } from "./FateLoading";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `请求失败 (${res.status})`;
  } catch {
    return `请求失败 (${res.status})`;
  }
}

export function SoulPage() {
  const [soul, setSoul] = useState<SoulRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/soul")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return res.json() as Promise<{ soul: SoulRecord }>;
      })
      .then((data) => setSoul(data.soul))
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="shell">
        <FateLoading label="灵识汇聚中" />
      </div>
    );
  }

  if (error || !soul) {
    return (
      <div className="shell">
        <p className="error-text">{error || "无法读取灵识"}</p>
        <Link href="/" className="ghost-btn link-btn">
          返回
        </Link>
      </div>
    );
  }

  return (
    <div className="shell soul-shell">
      <header className="soul-header">
        <Link href="/" className="ghost-btn link-btn">
          ← 返回
        </Link>
        <p className="eyebrow">跨世档案</p>
        <h1>灵识</h1>
        {soul.gameCleared ? (
          <p className="soul-cleared-badge">炼心圆满 · 已通关</p>
        ) : null}
      </header>

      <section className="soul-essence">
        <h2>本质</h2>
        <p>{soul.essence}</p>
      </section>

      <section className="soul-stats">
        <h2>轮回</h2>
        <ul>
          <li>
            <span>已历</span>
            <strong>{soul.stats.totalLives}</strong> 世
          </li>
          <li>
            <span>共</span>
            <strong>{soul.stats.totalTurns}</strong> 拍
          </li>
          <li>
            <span>寿终</span>
            <strong>{soul.stats.deaths}</strong> 次
          </li>
          <li>
            <span>曾近圆满</span>
            <strong>{soul.stats.nearEnlightenment}</strong> 次
          </li>
        </ul>
      </section>

      <section className="soul-bonds">
        <h2>羁绊人物</h2>
        {soul.bonds.length === 0 ? (
          <p className="muted">尚无深缘记入灵识。</p>
        ) : (
          <ul className="bond-grid">
            {soul.bonds.map((b) => (
              <li key={b.id} className="bond-card">
                <h3>{b.name}</h3>
                {b.epithet ? <p className="bond-epithet">{b.epithet}</p> : null}
                <p className="bond-meta">
                  {b.originEra} · 羁绊 {b.bondPeak}
                </p>
                <p className="bond-memory">{b.memory}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="soul-relics">
        <h2>羁绊道具</h2>
        {soul.relics.length === 0 ? (
          <p className="muted">尚无念物。</p>
        ) : (
          <ul className="relic-grid">
            {soul.relics.map((r) => (
              <li key={r.id} className="relic-card">
                <h3>{r.name}</h3>
                <p className="bond-meta">{r.originEra}</p>
                <p className="bond-memory">{r.memory}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="soul-threads">
        <h2>课题脉络</h2>
        {soul.themeThreads.length === 0 ? (
          <p className="muted">尚无课题留下痕迹。</p>
        ) : (
          <ol className="thread-list">
            {[...soul.themeThreads].reverse().map((t) => (
              <li key={t.lifeId}>
                <span className="thread-hook">{t.hook}</span>
                <span className="thread-meta">
                  {t.lifeId} · {t.progress}%
                  {t.resolved ? " · 近圆满" : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="hero-actions">
        <Link href="/" className="primary-btn link-btn">
          再入轮回
        </Link>
      </div>
    </div>
  );
}
