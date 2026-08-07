import { readSoul } from "@/lib/game/soulStore";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const soul = await readSoul();
    return jsonOk({ soul });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(message, 500);
  }
}
