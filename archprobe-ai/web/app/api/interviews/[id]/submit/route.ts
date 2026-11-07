import { handle, readJson } from "@/lib/route";
import { submitTurn } from "@/lib/interview-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    request,
    async (viewer) => {
      const body = await readJson<{ answer?: unknown; mode?: unknown; diagram?: unknown }>(request);
      return submitTurn(viewer.sub, id, {
        message: typeof body.answer === "string" ? body.answer : "",
        mode: body.mode === "clarify" ? "clarify" : "answer",
        diagram: typeof body.diagram === "string" ? body.diagram : null,
      });
    },
    { write: true },
  );
}
