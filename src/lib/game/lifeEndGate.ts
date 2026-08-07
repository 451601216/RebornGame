import type { LifeState, SoulRecord } from "./types";

export type LifeEndResult =
  | { ended: false }
  | { ended: true; type: "death" | "enlightenment"; cause: string };

export type EnlightenmentGateInput = {
  state: LifeState;
  themeProgress: number;
  turnCount: number;
  soul: Pick<SoulRecord, "gameCleared">;
};

export function evaluateEnlightenmentGate(input: EnlightenmentGateInput): {
  passed: boolean;
  reasons: string[];
} {
  const { state, themeProgress, turnCount, soul } = input;
  const mind = state.mind;
  const reasons: string[] = [];

  if (soul.gameCleared) reasons.push("已通关，不可再次炼心圆满");
  if (themeProgress < 95) reasons.push(`课题进度 ${themeProgress} < 95`);
  if (turnCount < 25) reasons.push(`回合 ${turnCount} < 25`);
  if (state.age < 35) reasons.push(`年龄 ${state.age} < 35`);
  if (state.health < 40) reasons.push(`身 ${state.health} < 40`);

  if ((mind.清明 ?? 0) < 88) reasons.push(`清明 ${mind.清明} < 88`);
  if ((mind.慈悲 ?? 0) < 85) reasons.push(`慈悲 ${mind.慈悲} < 85`);
  if ((mind.执念 ?? 0) > 22) reasons.push(`执念 ${mind.执念} > 22`);
  if ((mind.嗔恨 ?? 0) > 22) reasons.push(`嗔恨 ${mind.嗔恨} > 22`);
  if ((mind.贪恋 ?? 0) > 22) reasons.push(`贪恋 ${mind.贪恋} > 22`);
  if ((mind.畏惧 ?? 0) > 22) reasons.push(`畏惧 ${mind.畏惧} > 22`);

  return { passed: reasons.length === 0, reasons };
}

/**
 * 当世终局判定（唯一入口）。优先级：炼心圆满 > 身尽 > 寿尽。
 */
export function evaluateLifeEnd(input: {
  state: LifeState;
  themeProgress: number;
  turnCount: number;
  soul: Pick<SoulRecord, "gameCleared">;
}): LifeEndResult {
  const gate = evaluateEnlightenmentGate(input);
  if (gate.passed) {
    return { ended: true, type: "enlightenment", cause: "炼心圆满" };
  }
  if (input.state.health <= 0) {
    return { ended: true, type: "death", cause: "身尽" };
  }
  if (input.state.age >= 100) {
    return { ended: true, type: "death", cause: "寿尽" };
  }
  return { ended: false };
}
