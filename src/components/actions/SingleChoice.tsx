"use client";

import type { EventUi, PlayerInput } from "@/lib/game/types";

type Props = {
  ui: EventUi;
  disabled?: boolean;
  onSubmit: (input: PlayerInput) => void;
};

export function SingleChoice({ ui, disabled, onSubmit }: Props) {
  const options = ui.options ?? [];
  return (
    <div className="action-block">
      {ui.prompt ? <p className="action-prompt">{ui.prompt}</p> : null}
      <div className="choice-list">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="choice-btn"
            disabled={disabled}
            onClick={() =>
              onSubmit({ type: "single", optionId: opt.id, label: opt.label })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
