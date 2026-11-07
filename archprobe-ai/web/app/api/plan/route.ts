import { handle, readJson } from "@/lib/route";
import { getHome, savePlan } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, async (viewer) => ({ ...(await getHome(viewer.sub)), viewer_name: viewer.name }));
}

export async function POST(request: Request) {
  return handle(
    request,
    async (viewer) => {
      const body = await readJson<{
        track?: string;
        company_type?: string;
        level?: string;
        interview_date?: string | null;
      }>(request);
      return { ...(await savePlan(viewer.sub, body)), viewer_name: viewer.name };
    },
    { write: true },
  );
}
