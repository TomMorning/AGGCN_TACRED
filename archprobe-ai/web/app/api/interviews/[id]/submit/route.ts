import { requireIdentity } from "../../../../../cursor/identity";
import { submitAnswer } from "@/lib/interview-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { answer?: string };
    const result = await submitAnswer(identity.sub, id, body.answer || "");
    return Response.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status },
    );
  }
}
