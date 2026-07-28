import { createNewLife } from "@/lib/game/engine";
import { listLives } from "@/lib/game/lifeStore";
import { jsonError, jsonOk } from "@/lib/http";
import { LlmConfigError, LlmResponseError } from "@/lib/llm/client";

export const runtime = "nodejs";

function mapError(err: unknown, fallbackStatus = 500) {
  if (err instanceof LlmConfigError) {
    return jsonError(err.message, 503);
  }
  if (err instanceof LlmResponseError) {
    return jsonError(err.message, 502);
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonError(message, fallbackStatus);
}

export async function GET() {
  try {
    const lives = await listLives();
    return jsonOk({ lives });
  } catch (err) {
    return mapError(err);
  }
}

export async function POST() {
  try {
    const life = await createNewLife();
    return jsonOk({ life });
  } catch (err) {
    return mapError(err);
  }
}
