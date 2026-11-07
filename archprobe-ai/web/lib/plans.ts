import { COMPANY_TYPES, TRACKS, type FocusArea } from "./catalog";

export type PlanScenario = {
  slug: string;
  difficulty: string;
  is_free: boolean;
  tracks: string[];
  focus_areas: string[];
};

export function mergeWeights(trackSlug: string, companySlug: string) {
  const track = TRACKS.find((t) => t.slug === trackSlug);
  const company = COMPANY_TYPES.find((c) => c.slug === companySlug);
  const merged: Partial<Record<FocusArea, number>> = {};
  for (const src of [track?.weights || {}, company?.weights || {}]) {
    for (const [k, v] of Object.entries(src)) {
      merged[k as FocusArea] = (merged[k as FocusArea] || 0) + (v || 0);
    }
  }
  const total = Object.values(merged).reduce((a, b) => a + (b || 0), 0) || 1;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(merged)) out[k] = Math.round(((v || 0) / total) * 100);
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

export function buildScenarioOrder(
  scenarios: PlanScenario[],
  trackSlug: string,
  weights: Record<string, number>,
  level: string,
) {
  const levelWord = level === "staff" ? "Staff" : "Senior";
  const scored = scenarios.map((s) => {
    const focus = s.focus_areas.reduce((sum, a) => sum + (weights[a] || 0), 0);
    const trackBoost = s.tracks.includes(trackSlug) ? 40 : 0;
    const levelBoost = s.difficulty.includes(levelWord) ? 15 : 0;
    return { slug: s.slug, free: s.is_free, score: focus + trackBoost + levelBoost };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8);
  const firstFree = top.findIndex((s) => s.free);
  if (firstFree > 0) top.unshift(...top.splice(firstFree, 1));
  return top.map((s) => s.slug);
}
