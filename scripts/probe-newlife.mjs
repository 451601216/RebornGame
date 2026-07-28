import fs from "fs";
import OpenAI from "openai";
import { z } from "zod";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const uiOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const uiFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
});

const eventUiSchema = z
  .object({
    type: z.enum(["single", "multi", "fill", "fill_choice", "none"]),
    prompt: z.string().optional(),
    options: z.array(uiOptionSchema).optional(),
    minSelect: z.number().int().positive().optional(),
    maxSelect: z.number().int().positive().optional(),
    fields: z.array(uiFieldSchema).optional(),
  })
  .superRefine((ui, ctx) => {
    if (ui.type === "single" || ui.type === "multi" || ui.type === "fill_choice") {
      if (!ui.options || ui.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: `${ui.type} needs >=2 options`,
          path: ["options"],
        });
      }
    }
    if (ui.type === "fill" || ui.type === "fill_choice") {
      if (!ui.fields || ui.fields.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: `${ui.type} needs fields`,
          path: ["fields"],
        });
      }
    }
  });

const lifeProfileSchema = z.object({
  era: z.string().min(1),
  name: z.string().min(1),
  birth: z.string().min(1),
  background: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1),
  themeHook: z.string().min(1),
});

const lifeStateSchema = z.object({
  age: z.number(),
  location: z.string().min(1),
  health: z.number(),
  mind: z.record(z.string(), z.number()),
  flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  inventory: z.array(z.string()),
  relationships: z.array(
    z.object({
      name: z.string(),
      bond: z.number(),
    }),
  ),
});

const newLifeLlmSchema = z.object({
  profile: lifeProfileSchema,
  state: lifeStateSchema,
  firstEvent: z.object({
    narrative: z.string().min(1),
    ui: eventUiSchema,
    stateDelta: z.record(z.string(), z.unknown()).default({}),
  }),
  summary: z.string().min(1),
});

const client = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });

const system = `你是文字游戏「轮回炼心」的叙事与裁判引擎。只输出一个 JSON 对象。
字段：
{
  "profile": { "era", "name", "birth", "background", "traits": string[], "themeHook" },
  "state": { "age", "location", "health", "mind": {"执念":n,"清明":n}, "flags": {}, "inventory": [], "relationships": [{"name","bond"}] },
  "firstEvent": { "narrative", "ui": { "type":"single|multi|fill|fill_choice|none", "prompt"?, "options"?, "fields"? }, "stateDelta": {} },
  "summary": string
}
single/multi/fill_choice 至少 2 个 options；fill/fill_choice 至少一个 fields。`;

const user = `请生成与既往世互异的新一世开局（尚无既往世）。从幼年可玩节点开始。`;

const completion = await client.chat.completions.create({
  model: env.LLM_MODEL,
  temperature: 0.9,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: system },
    { role: "user", content: user },
  ],
});

const content = completion.choices[0]?.message?.content ?? "";
console.log("RAW_LEN", content.length);
console.log("RAW_HEAD", content.slice(0, 1500));
console.log("RAW_TAIL", content.slice(-500));

let parsed;
try {
  parsed = JSON.parse(content);
  console.log("PARSE_OK keys", Object.keys(parsed));
} catch (e) {
  console.error("PARSE_FAIL", e.message);
  process.exit(1);
}

const result = newLifeLlmSchema.safeParse(parsed);
if (!result.success) {
  console.error("ZOD_FAIL");
  console.error(result.error.message);
  console.error(JSON.stringify(result.error.issues, null, 2));
} else {
  console.log("ZOD_OK", result.data.profile.name, result.data.firstEvent.ui.type);
}
