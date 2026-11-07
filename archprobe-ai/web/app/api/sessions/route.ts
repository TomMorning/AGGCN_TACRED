import { handle } from "@/lib/route";
import { listSessions } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, async (viewer) => ({ sessions: await listSessions(viewer.sub) }));
}
