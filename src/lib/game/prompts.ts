import type { ProfileFingerprint } from "./types";

export const GAME_SYSTEM_RULES = `你是文字游戏「轮回炼心」的叙事与裁判引擎。
主题：众生轮回，借一世人生磨砺心性（执念、清明、慈悲、嗔恨等）。
硬性规则：
1. 只输出一个 JSON 对象，不要 markdown，不要解释。
2. 交互控件由你按本轮情节决定 ui.type，可选：single | multi | fill | fill_choice | none。不要每轮都用 single。
3. single/multi/fill_choice 必须提供至少 2 个 options；每个 option 必须是对象 {"id":"a","label":"选项文案"}，禁止只写字符串数组。
4. fill/fill_choice 的 fields 必须是对象数组 {"id":"f1","label":"题干","placeholder"?:string,"required"?:boolean}。
5. relationships[].bond、age、health、mind 数值必须是 JSON number，不要用字符串。
6. options/fields 文案必须紧扣本轮叙事，禁止万能无关选项。
7. 单选一般 2–4 项；多选设置合理的 minSelect/maxSelect；填空题干要具体。
8. 死亡时 ui.type 必须为 none，并填写 death.died=true 与 cause/epilogue。
9. stateDelta 只写相对变化或覆盖字段；可用点路径如 "mind.清明"。
10. 年龄推进要合理（童年事件可小步，成年可数年），不要无故瞬移到死亡，除非情节充分。
11. 禁止复述与近期事件高度雷同的情节。`;

export function buildNewLifeSystemPrompt(): string {
  return `${GAME_SYSTEM_RULES}

开世任务：生成「全新一世」的出身与开篇。
输出 JSON 示例（字段必须齐全）：
{
  "profile": { "era":"...", "name":"...", "birth":"...", "background":"...", "traits":["..."], "themeHook":"..." },
  "state": {
    "age": 7,
    "location": "...",
    "health": 80,
    "mind": { "执念": 20, "清明": 35 },
    "flags": {},
    "inventory": [],
    "relationships": [{ "name": "母亲", "bond": 60 }]
  },
  "firstEvent": {
    "narrative": "...",
    "ui": {
      "type": "single",
      "prompt": "...",
      "options": [{ "id": "a", "label": "..." }, { "id": "b", "label": "..." }]
    },
    "stateDelta": {}
  },
  "summary": "一句话本世开局摘要"
}
要求：新世必须在阶层、地域/时代、身份、冲突类型、心性课题上与既往世至少拉开 3 个维度差异。`;
}

export function buildNewLifeUserPrompt(past: ProfileFingerprint[]): string {
  const fingerprints =
    past.length === 0
      ? "（尚无既往世，可自由开局，但仍需鲜明、可玩。）"
      : JSON.stringify(
          past.map((p) => ({
            id: p.id,
            era: p.era,
            background: p.background,
            traits: p.traits,
            themeHook: p.themeHook,
            nameStyle: p.name,
            summaryTag: p.summaryTag,
          })),
          null,
          2,
        );

  return `请生成与下列既往世背景互异的新一世开局。
既往世指纹（仅供去重，不要继承其记忆或事件）：
${fingerprints}

从出生或幼年可玩节点开始 firstEvent；state.age 通常为 0–12；mind 至少包含「执念」「清明」数值。`;
}

export function buildTurnSystemPrompt(): string {
  return `${GAME_SYSTEM_RULES}

推进任务：根据当世档案与玩家本轮输入，生成下一事件。
输出 JSON：
{
  "narrative": string,
  "ageAdvance"?: number,
  "ui": { "type", "prompt"?, "options"?, "minSelect"?, "maxSelect"?, "fields"? },
  "stateDelta": {},
  "death"?: { "died": boolean, "cause"?, "epilogue"? },
  "summaryUpdate"?: string
}
只使用当前这一世信息，禁止引入其他世记忆。`;
}

export function buildSummarySystemPrompt(): string {
  return `你是「轮回炼心」摘要器。只输出 JSON：{ "summary": string }。
用 120–200 字中文概括此人迄今人生（出身、关键选择、心性变化、未了之事），供后续回合上下文使用。不要编造档案中没有的事实。`;
}
