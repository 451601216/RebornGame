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
  mind: Record<string, number>;
  flags: Record<string, boolean | string | number>;
  inventory: string[];
  relationships: Relationship[];
};

export type LifeEvent = {
  turn: number;
  age: number;
  narrative: string;
  ui: EventUi;
  stateDelta?: Record<string, unknown>;
  playerInput?: PlayerInput | null;
  death?: {
    died: boolean;
    cause?: string;
    epilogue?: string;
  };
};

export type LifeMeta = {
  startedAt: string;
  endedAt: string | null;
  status: "alive" | "dead";
};

export type LifeRecord = {
  id: string;
  meta: LifeMeta;
  profile: LifeProfile;
  state: LifeState;
  events: LifeEvent[];
  summary: string;
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
  status: "alive" | "dead";
  name: string;
  era: string;
  age: number;
  startedAt: string;
  endedAt: string | null;
  themeHook: string;
};
