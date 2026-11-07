import { handle } from "@/lib/route";
import { advanceRound } from "@/lib/interview-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(request, (viewer) => advanceRound(viewer.sub, id), { write: true });
}
