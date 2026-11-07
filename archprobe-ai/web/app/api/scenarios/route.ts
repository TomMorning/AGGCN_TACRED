import { handle } from "@/lib/route";
import { listScenarios } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, (viewer) => listScenarios(viewer.sub));
}
