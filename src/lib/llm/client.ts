import OpenAI from "openai";
import type { ZodType } from "zod";

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigError";
  }
}

export class LlmResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmResponseError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new LlmConfigError(
      `缺少环境变量 ${name}。请在 .env.local 中配置 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL（禁止 mock）。`,
    );
  }
  return value;
}

export function getLlmClient(): { client: OpenAI; model: string } {
  const apiKey = requireEnv("LLM_API_KEY");
  const baseURL = requireEnv("LLM_BASE_URL");
  const model = requireEnv("LLM_MODEL");
  const client = new OpenAI({ apiKey, baseURL });
  return { client, model };
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function callLlmJson<T>(params: {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxRetries?: number;
}): Promise<T> {
  const { client, model } = getLlmClient();
  const maxRetries = params.maxRetries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const retryHint =
      attempt === 0
        ? ""
        : `\n\n【重试】上一次输出无法通过校验：${String(lastError)}。请严格输出合法 JSON，字段完整且符合 schema。`;

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user + retryHint },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new LlmResponseError("LLM 返回空内容");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJsonText(content));
      } catch {
        throw new LlmResponseError("LLM 返回的不是合法 JSON");
      }

      const result = params.schema.safeParse(parsed);
      if (!result.success) {
        const detail = result.error.issues
          .slice(0, 8)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
        throw new LlmResponseError(`JSON 结构不符合约定：${detail}`);
      }
      return result.data;
    } catch (err) {
      lastError = err;
      if (err instanceof LlmConfigError) throw err;
      if (attempt >= maxRetries) break;
    }
  }

  throw new LlmResponseError(
    `LLM 调用或校验失败（已真实重试）：${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
