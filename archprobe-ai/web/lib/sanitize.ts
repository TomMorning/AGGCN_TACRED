import { MAX_ANSWER_CHARS, MIN_ANSWER_CHARS } from "./limits";

const MAX_MERMAID_CHARS = 4000;

/** Cap paid LLM prompt size and reject empty fluff. */
export function validateAnswer(answer: string): string {
  const trimmed = answer.trim();
  if (trimmed.length < MIN_ANSWER_CHARS) {
    throw Object.assign(
      new Error(
        `Write at least ~${MIN_ANSWER_CHARS} characters — name components, trade-offs, and bounds.`,
      ),
      { status: 400 },
    );
  }
  if (trimmed.length > MAX_ANSWER_CHARS) {
    throw Object.assign(
      new Error(`Answer too long (max ${MAX_ANSWER_CHARS} characters). Tighten the design defense.`),
      { status: 400 },
    );
  }
  return trimmed;
}

/**
 * Keep only Mermaid flowchart syntax. Strip HTML/JS and unknown directives
 * so rendered SVG is safe under securityLevel: "strict".
 */
export function sanitizeMermaid(input: string, fallback = ""): string {
  const raw = (input || "").replace(/\r/g, "").trim();
  if (!raw) return fallback;
  const lines = raw
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => {
      const t = l.trim();
      if (!t) return true;
      if (/<[^>]+>/.test(t)) return false;
      if (/javascript:|on\w+=/i.test(t)) return false;
      if (/^%%{/.test(t)) return false;
      return true;
    });
  let out = lines.join("\n").trim();
  if (!/^(graph|flowchart)\s/i.test(out)) {
    out = `graph TD\n${out}`;
  }
  if (out.length > MAX_MERMAID_CHARS) out = out.slice(0, MAX_MERMAID_CHARS);
  return out || fallback;
}

export { MAX_ANSWER_CHARS, MIN_ANSWER_CHARS };
