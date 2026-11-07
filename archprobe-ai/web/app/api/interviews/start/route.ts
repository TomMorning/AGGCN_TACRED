import { requireIdentity } from "../../../../cursor/identity";
import { startInterview } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  try {
    const body = (await request.json()) as { slug?: string };
    if (!body.slug) return Response.json({ error: "slug required" }, { status: 400 });
    const session = await startInterview(identity.sub, body.slug);
    return Response.json(session, { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status },
    );
  }
}
