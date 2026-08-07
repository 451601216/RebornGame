import type { MindKey, MindState } from "./mind";

export type UiType = "single" | "multi" | "fill" | "fill_choice" | "none";

export type UiOption = {
  id: string;
  label: string;
};

export type UiField = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type EventUi = {
  type: UiType;
  prompt?: string;
  options?: UiOption[];
  minSelect?: number;
  maxSelect?: number;
  fields?: UiField[];
};

export type PlayerInput =
  | { type: "single"; optionId: string; label: string }
  | { type: "multi"; optionIds: string[]; labels: string[] }
  | { type: "fill"; values: Record<string, string> }
  | { type: "fill_choice"; optionId: string; label: string; values: Record<string, string> }
  | { type: "none" };

export type LifeProfile = {
  era: string;
  name: string;
  birth: string;
  background: string;
  traits: string[];
  themeHook: string;
};

export type Relationship = {
  name: string;
  bond: number;
};

export type LifeState = {
  age: number;
  location: string;
  health: number;
  /** 固定六维心性，见 mind.ts */
  mind: MindState;
  flags: Record<string, boolean | string | number>;
  inventory: string[];
  relationships: Relationship[];
};

/** Engine 写入的当世结局（非 LLM 返回） */
export type LifeEnding = {
  type: "death" | "enlightenment";
  cause: string;
  epilogue?: string;
};

export type LifeEvent = {
  turn: number;
  age: number;
  narrative: string;
  ui: EventUi;
  stateDelta?: Record<string, unknown>;
  playerInput?: PlayerInput | null;
  /** @deprecated 旧档兼容；新逻辑用 ending */
  death?: {
    died: boolean;
    cause?: string;
    epilogue?: string;
  };
  ending?: LifeEnding;
};

export type LifeMeta = {
  startedAt: string;
  endedAt: string | null;
  status: "alive" | "dead" | "cleared";
};

export type LifeRecord = {
  id: string;
  meta: LifeMeta;
  profile: LifeProfile;
  state: LifeState;
  events: LifeEvent[];
  summary: string;
  /** 开局心性，供结算对比 */
  initialMind?: MindState;
};

export type ProfileFingerprint = {
  id: string;
  era: string;
  name: string;
  background: string;
  traits: string[];
  themeHook: string;
  summaryTag?: string;
};

export type LifeListItem = {
  id: string;
  status: "alive" | "dead" | "cleared";
  name: string;
  era: string;
  age: number;
  startedAt: string;
  endedAt: string | null;
  themeHook: string;
};

export type BondCharacter = {
  id: string;
  name: string;
  epithet?: string;
  originLifeId: string;
  originEra: string;
  bondPeak: number;
  memory: string;
  relationship?: string;
};

export type BondRelic = {
  id: string;
  name: string;
  originLifeId: string;
  originEra: string;
  memory: string;
};

export type ThemeThread = {
  hook: string;
  lifeId: string;
  progress: number;
  resolved: boolean;
};

export type SoulRecord = {
  essence: string;
  gameCleared: boolean;
  clearedAt?: string;
  clearedLifeId?: string;
  stats: {
    totalLives: number;
    totalTurns: number;
    deaths: number;
    nearEnlightenment: number;
  };
  bonds: BondCharacter[];
  relics: BondRelic[];
  mindImprint: Partial<Record<MindKey, number>>;
  themeThreads: ThemeThread[];
  lastUpdated: string;
};
