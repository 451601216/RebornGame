import fs from "fs";
import OpenAI from "openai";
import { z } from "zod";

// Minimal copy of fixed coercion rules for offline verify
const uiOptionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const uiOptionInputSchema = z.union([
  uiOptionSchema,
  z.string().min(1).transform((label) => ({
    id: "pending",
    label: label.replace(/^\[|\]$/g, "").trim() || label,
  })),
]);
const numberish = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: "custom", message: `bad number ${v}` });
    return z.NEVER;
  }
  return n;
});
const eventUiSchema = z
  .object({
    type: z.enum(["single", "multi", "fill", "fill_choice", "none"]),
    prompt: z.string().optional(),
    options: z.array(uiOptionInputSchema).optional(),
    fields: z.array(z.any()).optional(),
  })
  .transform((ui) => ({
    ...ui,
    options: ui.options?.map((opt, index) => ({
      id: !opt.id || opt.id === "pending" ? `o${index + 1}` : opt.id,
      label: opt.label,
    })),
  }))
  .superRefine((ui, ctx) => {
    if (["single", "multi", "fill_choice"].includes(ui.type)) {
      if (!ui.options || ui.options.length < 2) {
        ctx.addIssue({ code: "custom", message: "need options", path: ["options"] });
      }
    }
  });

const sample = {
  profile: {
    era: "大周景和七年",
    name: "苏清婉",
    birth: "景和七年三月三",
    background: "边陲灵脉村遗孤",
    traits: ["灵觉通透"],
    themeHook: "被遗忘的灵根",
  },
  state: {
    age: 6,
    location: "雾隐村",
    health: 60,
    mind: { 执念: 35, 清明: 70 },
    flags: { is_orphan: true },
    inventory: ["褪色红绳"],
    relationships: [
      { name: "老村长", bond: "3" },
      { name: "亡母", bond: "5" },
    ],
  },
  firstEvent: {
    narrative: "震动",
    ui: {
      type: "multi",
      prompt: "你要",
      options: ["[触碰地脉]", "[逃离道观]", "[呼唤村长]"],
    },
    stateDelta: {},
  },
  summary: "摘要",
};

const schema = z.object({
  profile: z.object({
    era: z.string(),
    name: z.string(),
    birth: z.string(),
    background: z.string(),
    traits: z.array(z.string()).min(1),
    themeHook: z.string(),
  }),
  state: z.object({
    age: numberish,
    location: z.string(),
    health: numberish,
    mind: z.record(z.string(), numberish),
    flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
    inventory: z.array(z.string()),
    relationships: z.array(z.object({ name: z.string(), bond: numberish })),
  }),
  firstEvent: z.object({
    narrative: z.string(),
    ui: eventUiSchema,
    stateDelta: z.record(z.string(), z.unknown()).default({}),
  }),
  summary: z.string(),
});

const r = schema.safeParse(sample);
console.log(r.success ? "COERCE_OK" : "COERCE_FAIL");
if (r.success) {
  console.log(JSON.stringify(r.data.firstEvent.ui.options, null, 2));
  console.log(r.data.state.relationships);
} else {
  console.log(r.error.message);
}

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
const client = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });
const res = await fetch("http://localhost:3000/api/life", { method: "POST" });
const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 1200));
