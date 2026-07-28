"use client";

import { useMemo, useState } from "react";
import type { EventUi, PlayerInput } from "@/lib/game/types";

type Props = {
  ui: EventUi;
  disabled?: boolean;
  onSubmit: (input: PlayerInput) => void;
};

export function MultiChoice({ ui, disabled, onSubmit }: Props) {
  const options = ui.options ?? [];
  const minSelect = ui.minSelect ?? 1;
  const maxSelect = ui.maxSelect ?? options.length;
  const [selected, setSelected] = useState<string[]>([]);

  const labels = useMemo(() => {
    return selected.map(
      (id) => options.find((o) => o.id === id)?.label ?? id,
    );
  }, [selected, options]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  }

  const valid = selected.length >= minSelect && selected.length <= maxSelect;

  return (
    <div className="action-block">
      {ui.prompt ? <p className="action-prompt">{ui.prompt}</p> : null}
      <p className="action-hint">
        请选择 {minSelect}
        {maxSelect !== minSelect ? `–${maxSelect}` : ""} 项
      </p>
      <div className="choice-list">
        {options.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label key={opt.id} className={`multi-item ${checked ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        className="primary-btn"
        disabled={disabled || !valid}
        onClick={() =>
          onSubmit({ type: "multi", optionIds: selected, labels })
        }
      >
        确认选择
      </button>
    </div>
  );
}
