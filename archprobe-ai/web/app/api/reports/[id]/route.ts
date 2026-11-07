import { handle } from "@/lib/route";
import { getReport } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(request, (viewer) => getReport(viewer.sub, id));
}
