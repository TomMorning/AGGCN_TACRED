import { requireIdentity } from "../cursor/identity";

type Viewer = { sub: string; name: string };

const PRIVATE = { "cache-control": "private, no-store" };

function errorResponse(e: unknown) {
  const status = (e as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    return Response.json({ error: (e as Error).message }, { status, headers: PRIVATE });
  }
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: PRIVATE });
}

/** Rejects cross-site and non-JSON writes so a third-party page cannot drive the viewer's session. */
function rejectCrossSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return Response.json({ error: "Cross-site request blocked" }, { status: 403, headers: PRIVATE });
  }
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Expected application/json" }, { status: 415, headers: PRIVATE });
  }
  return null;
}

export async function handle(
  request: Request,
  fn: (viewer: Viewer) => Promise<unknown>,
  opts: { write?: boolean } = {},
) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (opts.write) {
    const blocked = rejectCrossSite(request);
    if (blocked) return blocked;
  }
  try {
    const data = await fn({ sub: identity.sub, name: identity.name || "" });
    if (data == null) return Response.json({ error: "Not found" }, { status: 404, headers: PRIVATE });
    return Response.json(data, { headers: PRIVATE });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}
