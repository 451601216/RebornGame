import { readLife } from "@/lib/game/lifeStore";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const life = await readLife(id);
    return jsonOk({ life });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes("ENOENT") || message.includes("no such file") ? 404 : 500;
    return jsonError(status === 404 ? "存档不存在" : message, status);
  }
}
