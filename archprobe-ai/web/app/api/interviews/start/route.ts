import { handle, readJson } from "@/lib/route";
import { startInterview } from "@/lib/interview-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(
    request,
    async (viewer) => {
      const body = await readJson<{ slug?: string }>(request);
      if (!body.slug) throw Object.assign(new Error("slug required"), { status: 400 });
      return startInterview(viewer.sub, body.slug);
    },
    { write: true },
  );
}
