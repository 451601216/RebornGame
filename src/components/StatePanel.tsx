"use client";

import type { LifeRecord } from "@/lib/game/types";

type Props = {
  life: LifeRecord;
};

export function StatePanel({ life }: Props) {
  const mindEntries = Object.entries(life.state.mind ?? {});
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
      {mindEntries.length > 0 ? (
        <div className="mind-block">
          <h3>心性</h3>
          <ul>
            {mindEntries.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {life.summary ? (
        <div className="summary-block">
          <h3>摘要</h3>
          <p>{life.summary}</p>
        </div>
      ) : null}
    </aside>
  );
}
