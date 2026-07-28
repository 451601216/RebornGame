"use client";

import { useState } from "react";
import type { EventUi, PlayerInput } from "@/lib/game/types";

type Props = {
  ui: EventUi;
  disabled?: boolean;
  onSubmit: (input: PlayerInput) => void;
};

export function FillChoice({ ui, disabled, onSubmit }: Props) {
  const options = ui.options ?? [];
  const fields = ui.fields ?? [];
  const [optionId, setOptionId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, ""])),
  );

  const label = options.find((o) => o.id === optionId)?.label ?? "";
  const fieldsOk = fields.every((f) => {
    if (f.required === false) return true;
    return (values[f.id] ?? "").trim().length > 0;
  });
  const valid = Boolean(optionId) && fieldsOk;

  return (
    <div className="action-block">
      {ui.prompt ? <p className="action-prompt">{ui.prompt}</p> : null}
      <div className="choice-list">
        {options.map((opt) => (
          <label key={opt.id} className={`multi-item ${optionId === opt.id ? "on" : ""}`}>
            <input
              type="radio"
              name="fill-choice"
              checked={optionId === opt.id}
              disabled={disabled}
              onChange={() => setOptionId(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
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
        onClick={() =>
          onSubmit({ type: "fill_choice", optionId, label, values })
        }
      >
        确认
      </button>
    </div>
  );
}
