import { requireIdentity } from "../../../../cursor/identity";
import { getScenarioForViewer } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  const { slug } = await ctx.params;
  try {
    const scenario = await getScenarioForViewer(identity.sub, slug);
    if (!scenario) return Response.json({ error: "not found" }, { status: 404 });
    if (scenario.locked) {
      return Response.json(scenario, {
        status: 200,
        headers: { "cache-control": "private, no-store" },
      });
    }
    return Response.json(scenario, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
