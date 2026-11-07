import { handle } from "@/lib/route";
import { dashboard } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, (viewer) => dashboard(viewer.sub));
}
