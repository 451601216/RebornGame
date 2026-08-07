import { z } from "zod";
import { coerceSummaryToText, memoryCardSchema } from "./memoryCard";
import { MIND_KEYS, normalizeMind } from "./mind";

const uiOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

/** Accept `{id,label}` or plain string labels from LLM. */
const uiOptionInputSchema = z.union([
  uiOptionSchema,
  z.string().min(1).transform((label) => ({
    id: "pending",
    label: label.replace(/^\[|\]$/g, "").trim() || label,
  })),
]);

const uiFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
});

const uiFieldInputSchema = z.union([
  uiFieldSchema,
  z.string().min(1).transform((label) => ({
    id: "pending",
    label,
  })),
]);

const numberish = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: "custom", message: `无法转为数字: ${v}` });
    return z.NEVER;
  }
  return n;
});

export const eventUiSchema = z
  .object({
    type: z.enum(["single", "multi", "fill", "fill_choice", "none"]),
    prompt: z.string().optional(),
    options: z.array(uiOptionInputSchema).optional(),
    minSelect: numberish.optional(),
    maxSelect: numberish.optional(),
    fields: z.array(uiFieldInputSchema).optional(),
  })
  .transform((ui) => {
    const options = ui.options?.map((opt, index) => ({
      id: !opt.id || opt.id === "pending" ? `o${index + 1}` : opt.id,
      label: opt.label,
    }));
    const fields = ui.fields?.map((field, index) => {
      const id = !field.id || field.id === "pending" ? `f${index + 1}` : field.id;
      const out: {
        id: string;
        label: string;
        placeholder?: string;
        required?: boolean;
      } = { id, label: field.label };
      if ("placeholder" in field && field.placeholder) {
        out.placeholder = field.placeholder as string;
      }
      if ("required" in field && field.required !== undefined) {
        out.required = field.required as boolean;
      }
      return out;
    });
    return { ...ui, options, fields };
  })
  .superRefine((ui, ctx) => {
    if (ui.type === "single" || ui.type === "multi" || ui.type === "fill_choice") {
      if (!ui.options || ui.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: `${ui.type} 需要至少 2 个 options，且每项为 {id,label} 或字符串`,
          path: ["options"],
        });
      }
    }
    if (ui.type === "fill" || ui.type === "fill_choice") {
      if (!ui.fields || ui.fields.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: `${ui.type} 需要至少一个 fields`,
          path: ["fields"],
        });
      }
    }
  });

export const playerInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("single"),
    optionId: z.string().min(1),
    label: z.string().min(1),
  }),
  z.object({
    type: z.literal("multi"),
    optionIds: z.array(z.string().min(1)).min(1),
    labels: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("fill"),
    values: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal("fill_choice"),
    optionId: z.string().min(1),
    label: z.string().min(1),
    values: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal("none"),
  }),
]);

export const turnLlmSchema = z.object({
  narrative: z.string().min(1),
  ageAdvance: numberish.optional(),
  ui: eventUiSchema,
  stateDelta: z.record(z.string(), z.unknown()).default({}),
  death: z
    .object({
      died: z.boolean(),
      cause: z.string().optional(),
      epilogue: z.string().optional(),
    })
    .optional(),
  summaryUpdate: z.string().optional(),
});

export const lifeProfileSchema = z.object({
  era: z.string().min(1),
  name: z.string().min(1),
  birth: z.string().min(1),
  background: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1),
  themeHook: z.string().min(1),
});

const mindValueSchema = z
  .record(z.string(), numberish)
  .transform((raw) => normalizeMind(raw))
  .superRefine((mind, ctx) => {
    for (const key of MIND_KEYS) {
      if (typeof mind[key] !== "number" || Number.isNaN(mind[key])) {
        ctx.addIssue({
          code: "custom",
          message: `mind 缺少有效数值：${key}`,
          path: [key],
        });
      }
    }
  });

export const lifeStateSchema = z.object({
  age: numberish,
  location: z.string().min(1),
  health: numberish,
  mind: mindValueSchema,
  flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  inventory: z.array(z.string()),
  relationships: z.array(
    z.object({
      name: z.string(),
      bond: numberish,
    }),
  ),
});

export const newLifeLlmSchema = z.object({
  profile: lifeProfileSchema,
  state: lifeStateSchema,
  firstEvent: z.object({
    narrative: z.string().min(1),
    ui: eventUiSchema,
    stateDelta: z.record(z.string(), z.unknown()).default({}),
  }),
  /** 开局记忆卡：对象或旧式字符串，统一存成格式化文本 */
  summary: z.union([memoryCardSchema, z.string().min(1)]).transform(coerceSummaryToText),
});

export const summaryLlmSchema = z.object({
  summary: memoryCardSchema.transform(coerceSummaryToText),
});

export type TurnLlmResult = z.infer<typeof turnLlmSchema>;
export type NewLifeLlmResult = z.infer<typeof newLifeLlmSchema>;
