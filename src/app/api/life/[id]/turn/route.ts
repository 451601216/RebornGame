import { advanceTurn } from "@/lib/game/engine";
import { playerInputSchema } from "@/lib/game/schema";
import { jsonError, jsonOk } from "@/lib/http";
import { LlmConfigError, LlmResponseError } from "@/lib/llm/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function mapError(err: unknown) {
  if (err instanceof LlmConfigError) {
    return jsonError(err.message, 503);
  }
  if (err instanceof LlmResponseError) {
    return jsonError(err.message, 502);
  }
  const message = err instanceof Error ? err.message : String(err);
  const status =
    message.includes("已终结") || message.includes("异常") || message.includes("损坏")
      ? 400
      : 500;
  return jsonError(message, status);
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = playerInputSchema.safeParse(body?.playerInput ?? body);
    if (!parsed.success) {
      return jsonError(`玩家输入无效：${parsed.error.message}`, 400);
    }

    const life = await advanceTurn(id, parsed.data);
    return jsonOk({ life });
  } catch (err) {
    return mapError(err);
  }
}
