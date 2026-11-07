import { handle } from "@/lib/route";
import { getScenarioForViewer } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return handle(request, (viewer) => getScenarioForViewer(viewer.sub, slug));
}
