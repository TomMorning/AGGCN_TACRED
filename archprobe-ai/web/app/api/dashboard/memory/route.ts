import { requireIdentity } from "../../../../cursor/identity";
import { dashboard } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  try {
    const data = await dashboard(identity.sub);
    return Response.json(data, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
