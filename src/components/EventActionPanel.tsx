"use client";

import type { EventUi, PlayerInput } from "@/lib/game/types";
import { ContinueButton } from "./actions/ContinueButton";
import { FillChoice } from "./actions/FillChoice";
import { FillFields } from "./actions/FillFields";
import { MultiChoice } from "./actions/MultiChoice";
import { SingleChoice } from "./actions/SingleChoice";

type Props = {
  ui: EventUi;
  disabled?: boolean;
  dead?: boolean;
  onSubmit: (input: PlayerInput) => void;
  onReincarnate?: () => void;
};

export function EventActionPanel({
  ui,
  disabled,
  dead,
  onSubmit,
  onReincarnate,
}: Props) {
  if (dead) {
    return (
      <ContinueButton
        label="开启下一世"
        disabled={disabled}
        onClick={() => onReincarnate?.()}
      />
    );
  }

  switch (ui.type) {
    case "single":
      return <SingleChoice ui={ui} disabled={disabled} onSubmit={onSubmit} />;
    case "multi":
      return <MultiChoice ui={ui} disabled={disabled} onSubmit={onSubmit} />;
    case "fill":
      return <FillFields ui={ui} disabled={disabled} onSubmit={onSubmit} />;
    case "fill_choice":
      return <FillChoice ui={ui} disabled={disabled} onSubmit={onSubmit} />;
    case "none":
      return (
        <ContinueButton
          label={ui.prompt || "继续"}
          disabled={disabled}
          onClick={() => onSubmit({ type: "none" })}
        />
      );
    default:
      return (
        <p className="error-text">未知交互类型，请检查 LLM 返回的 ui.type</p>
      );
  }
}
