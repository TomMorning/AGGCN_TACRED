import { handle, readJson } from "@/lib/route";
import { submitAnswer } from "@/lib/interview-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    request,
    async (viewer) => {
      const body = await readJson<{ answer?: string }>(request);
      return submitAnswer(viewer.sub, id, typeof body.answer === "string" ? body.answer : "");
    },
    { write: true },
  );
}
