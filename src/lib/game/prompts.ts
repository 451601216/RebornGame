import {
  DEFAULT_MIND,
  mindExampleJson,
  mindPromptBlock,
} from "./mind";
import { soulLegacyForPrompt } from "./soulExtract";
import type { ProfileFingerprint, SoulRecord } from "./types";

export const GAME_SYSTEM_RULES = `你是文字游戏「轮回炼心」的叙事与裁判引擎。
主题：众生轮回，借一世人生磨砺心性。
硬性规则：
1. 只输出一个 JSON 对象，不要 markdown，不要解释。
2. 交互控件由你按本轮情节决定 ui.type，可选：single | multi | fill | fill_choice | none。不要每轮都用 single。
3. single/multi/fill_choice 必须提供至少 2 个 options；每个 option 必须是对象 {"id":"a","label":"选项文案"}，禁止只写字符串数组。
4. fill/fill_choice 的 fields 必须是对象数组 {"id":"f1","label":"题干","placeholder"?:string,"required"?:boolean}。
5. relationships[].bond、age、health、mind 数值必须是 JSON number，不要用字符串。
6. options/fields 文案必须紧扣本轮叙事，禁止万能无关选项。
7. 单选一般 2–4 项；多选设置合理的 minSelect/maxSelect；填空题干要具体。
8. 禁止输出 death、enlightenment、通关、圆满等结局字段；本世是否结束由系统根据 state 判定。可通过 stateDelta.health 相对增减反映伤势（如 -40），health 归零即本世终结。
9. stateDelta：health 写相对增减；非心性其它字段可覆盖；心性 mind 必须写相对增减（整数），可用点路径如 "mind.清明": 3 表示当前值+3。
10. 年龄推进要合理（童年事件可小步，成年可数年），不要无故把 health 打到 0，除非情节充分。
11. 禁止复述与记忆卡「禁忌重复」或上一拍高度雷同的情节。
12. 心性 mind 固定六维（每维 0–100 整数），不得增删键名：执念、清明、嗔恨、贪恋、畏惧、慈悲。
13. 每回合在「当前 state.mind」上微调：stateDelta 只写变化维的相对增减（通常单维 ±1～±8，相关维可联动），须有情节因果；禁止输出绝对目标值、禁止整表重写六维。
14. 长期情节以「记忆卡」为准；不要编造记忆卡与上一拍未提及的人物/事件。
心性六维判定：
${mindPromptBlock()}
判定示例：报复/迁怒 → 嗔恨↑、清明↓；体恤弱者 → 慈悲↑，嗔恨或贪恋可能↓；逃避抉择 → 畏惧↑；看清执念并放下 → 执念↓、清明↑。`;

const MEMORY_CARD_EXAMPLE = `{
  "anchor": "闽南海商幼子，家道中落",
  "unfinished": ["随父认潮学商", "家族账目亏空待查"],
  "people": "父亲(35)／乳母(80)",
  "mindTrend": "执念偏高，畏惧初显",
  "avoid": "勿反复写同一礁台认潮场面",
  "thread": "惊涛与算盘之间，心尚未定锚",
  "themeProgress": 8,
  "themeStage": "初识执念",
  "milestones": ["随父初见潮汛"]
}`;

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
    "mind": ${mindExampleJson()},
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
  "summary": ${MEMORY_CARD_EXAMPLE}
}
summary 必须是记忆卡对象：anchor / unfinished(≤3) / people / mindTrend / avoid? / thread / themeProgress(0–100) / themeStage / milestones(≤5)。
开局 themeProgress 通常 0–15；themeStage 一句话。
要求：新世必须在阶层、地域/时代、身份、冲突类型、心性课题上与既往世至少拉开 3 个维度差异。
开局 mind 必须包含全部六维，按出身与性格设定合理初值（儿童期极端值少见；参考中位约 ${JSON.stringify(DEFAULT_MIND)}）。
禁止输出任何结局字段。`;
}

export function buildNewLifeUserPrompt(
  past: ProfileFingerprint[],
  soul?: SoulRecord,
): string {
  const fingerprints =
    past.length === 0
      ? "（尚无既往世，可自由开局，但仍需鲜明、可玩。）"
      : JSON.stringify(
          past.map((p) => ({
            id: p.id,
            era: p.era,
            background: p.background.slice(0, 40),
            traits: p.traits,
            themeHook: p.themeHook,
            nameStyle: p.name,
          })),
          null,
          2,
        );

  let legacyBlock = "";
  if (soul) {
    const legacy = soulLegacyForPrompt(soul);
    legacyBlock = `
灵识遗产（仅氛围呼应，禁止继承具体事件、人物姓名或道具）：
${JSON.stringify(legacy)}
${legacy.unfinishedTheme ? `未竟课题可形成对照选题（勿重复同一故事）：曾修「${legacy.unfinishedTheme.hook}」（进度 ${legacy.unfinishedTheme.progress}）。` : ""}
${legacy.gameCleared ? "灵识已曾圆满：此世可为余韵世，课题可更抽象，但仍须鲜明可玩。" : ""}
`;
  }

  return `请生成与下列既往世背景互异的新一世开局。
既往世指纹（仅供去重，不要继承其记忆或事件）：
${fingerprints}
${legacyBlock}
从出生或幼年可玩节点开始 firstEvent；state.age 通常为 0–12；mind 必须包含全部六维：执念、清明、嗔恨、贪恋、畏惧、慈悲；summary 输出记忆卡对象（含 themeProgress/themeStage/milestones）。`;
}

export function buildTurnSystemPrompt(): string {
  return `${GAME_SYSTEM_RULES}

推进任务：根据当世记忆卡、上一拍与玩家本轮输入，生成下一事件。
输出 JSON：
{
  "narrative": string,
  "ageAdvance"?: number,
  "ui": { "type", "prompt"?, "options"?, "minSelect"?, "maxSelect"?, "fields"? },
  "stateDelta": {}
}
只使用当前这一世信息，禁止引入其他世记忆。
不要输出 summaryUpdate、death、enlightenment。
每 3–5 拍应出现与 themeHook / 课题进度相关的抉择或反思；课题进度 80+ 仅表示接近圆满边缘，叙事可渲染张力，但不得声明圆满或通关。
超过 5 拍偏离课题须拉回。
stateDelta 应据本轮选择、在当前 state.mind / health 上做有因果的相对增减：用 "mind.嗔恨": 4 表示 +4；"health": -15 表示身-15；未写的维保持原值。禁止把六维写成新的绝对数值表。`;
}

export function buildSummarySystemPrompt(): string {
  return `你是「轮回炼心」记忆卡更新器。只输出一个 JSON 对象：
{ "summary": { "anchor": string, "unfinished": string[], "people": string, "mindTrend": string, "avoid"?: string, "thread": string, "themeProgress": number, "themeStage": string, "milestones": string[] } }

规则：
1. 以旧记忆卡为底，用「刚结束的一拍」合并更新；不要编造未提及的事实。
2. unfinished 最多 3 条，过时条目删除，新冲突写入。
3. people 用「名(bond)」简洁罗列关键人物。
4. mindTrend 只写相对变化或当前突出的维，勿罗列全部六维数字。
5. avoid 可选，一句话提醒勿重复的场面。
6. thread 必须是一句文青主线，≤40 字，体现炼心气质。
7. themeProgress 为 0–100 整数，相对旧值单步变化通常 ±1～±10，须有情节因果；禁止无故跳变。
8. themeStage 一句阶段描述（如「初识执念」「渐能观照」）。
9. milestones 最多 5 条，记录本世已触发的关键节点；过时可删。
10. 全文信息密度优先，宁短勿注水。`;
}
