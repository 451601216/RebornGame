"use client";

import {
  getThemeProgress,
  getThemeStage,
  parseMemoryCardText,
} from "@/lib/game/memoryCard";
import { MIND_DIMENSIONS } from "@/lib/game/mind";
import type { LifeRecord } from "@/lib/game/types";
import Link from "next/link";

type Props = {
  life: LifeRecord;
};

export function StatePanel({ life }: Props) {
  const mind = life.state.mind ?? {};
  const themeProgress = getThemeProgress(life.summary);
  const themeStage = getThemeStage(life.summary);
  const card = parseMemoryCardText(life.summary);
  const health = Math.max(0, Math.min(100, life.state.health));
  const relationships = life.state.relationships ?? [];
  const inventory = life.state.inventory ?? [];

  return (
    <aside className="state-panel">
      <h2>当世</h2>
      <dl>
        <div>
          <dt>名</dt>
          <dd>{life.profile.name}</dd>
        </div>
        <div>
          <dt>时代</dt>
          <dd>{life.profile.era}</dd>
        </div>
        <div>
          <dt>年龄</dt>
          <dd>{life.state.age}</dd>
        </div>
        <div>
          <dt>所在</dt>
          <dd>{life.state.location}</dd>
        </div>
        <div>
          <dt>身</dt>
          <dd>
            <div className="health-row">
              <strong>{health}</strong>
              <div
                className="mind-bar health-bar"
                role="meter"
                aria-label={`身 ${health}`}
                aria-valuenow={health}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${health}%` }} />
              </div>
            </div>
          </dd>
        </div>
        <div>
          <dt>课题</dt>
          <dd>
            <div className="theme-block">
              <span className="theme-hook">{life.profile.themeHook}</span>
              <span className="theme-stage">{themeStage}</span>
              <div
                className="mind-bar theme-bar"
                role="meter"
                aria-label={`课题进度 ${themeProgress}`}
                aria-valuenow={themeProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${themeProgress}%` }} />
              </div>
              <span className="theme-progress-label">{themeProgress}%</span>
            </div>
          </dd>
        </div>
      </dl>
      <div className="mind-block">
        <h3>心性</h3>
        <ul>
          {MIND_DIMENSIONS.map(({ key, blurb }) => {
            const value = typeof mind[key] === "number" ? mind[key] : 0;
            const pct = Math.max(0, Math.min(100, value));
            return (
              <li key={key}>
                <div className="mind-row">
                  <div className="mind-label">
                    <span className="mind-name">{key}</span>
                    <span className="mind-blurb">{blurb}</span>
                  </div>
                  <strong className="mind-value">{value}</strong>
                </div>
                <div
                  className="mind-bar"
                  role="meter"
                  aria-label={`${key} ${value}`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {relationships.length > 0 ? (
        <div className="relations-block">
          <h3>关系</h3>
          <ul>
            {relationships.map((r) => (
              <li key={r.name}>
                <span>{r.name}</span>
                <strong>{r.bond}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {inventory.length > 0 ? (
        <div className="inventory-block">
          <h3>随身</h3>
          <ul>
            {inventory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {life.summary ? (
        <div className="summary-block">
          <h3>记忆卡</h3>
          <p>{life.summary}</p>
          {card?.milestones && card.milestones.length > 0 ? (
            <p className="milestones-line">
              里程碑：{card.milestones.join("；")}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="soul-link">
        <Link href="/soul">查看灵识 →</Link>
      </p>
    </aside>
  );
}
