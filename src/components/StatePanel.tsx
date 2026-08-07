"use client";

import { MIND_DIMENSIONS } from "@/lib/game/mind";
import type { LifeRecord } from "@/lib/game/types";

type Props = {
  life: LifeRecord;
};

export function StatePanel({ life }: Props) {
  const mind = life.state.mind ?? {};
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
          <dd>{life.state.health}</dd>
        </div>
        <div>
          <dt>课题</dt>
          <dd>{life.profile.themeHook}</dd>
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
      {life.summary ? (
        <div className="summary-block">
          <h3>记忆卡</h3>
          <p>{life.summary}</p>
        </div>
      ) : null}
    </aside>
  );
}
