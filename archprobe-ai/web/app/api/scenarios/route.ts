import { requireIdentity } from "../../../cursor/identity";
import { ensureQuota, listScenarios, passProbability } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  try {
    const [scenarios, pass, quota] = await Promise.all([
      listScenarios(),
      passProbability(identity.sub),
      ensureQuota(identity.sub),
    ]);
    return Response.json(
      { scenarios, pass_probability: pass, quota },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
