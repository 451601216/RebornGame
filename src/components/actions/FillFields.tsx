"use client";

import { useState } from "react";
import type { EventUi, PlayerInput } from "@/lib/game/types";

type Props = {
  ui: EventUi;
  disabled?: boolean;
  onSubmit: (input: PlayerInput) => void;
};

export function FillFields({ ui, disabled, onSubmit }: Props) {
  const fields = ui.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, ""])),
  );

  const valid = fields.every((f) => {
    if (f.required === false) return true;
    return (values[f.id] ?? "").trim().length > 0;
  });

  return (
    <div className="action-block">
      {ui.prompt ? <p className="action-prompt">{ui.prompt}</p> : null}
      <div className="field-list">
        {fields.map((field) => (
          <label key={field.id} className="field-item">
            <span>{field.label}</span>
            <input
              type="text"
              value={values[field.id] ?? ""}
              placeholder={field.placeholder}
              disabled={disabled}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
              }
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="primary-btn"
        disabled={disabled || !valid}
        onClick={() => onSubmit({ type: "fill", values })}
      >
        写下答案
      </button>
    </div>
  );
}
