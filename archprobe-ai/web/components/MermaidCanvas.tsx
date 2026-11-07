"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  chart: string;
  className?: string;
};

function clientSanitize(chart: string) {
  return chart
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .split("\n")
    .filter((l) => !/^\s*%%{/.test(l))
    .join("\n")
    .trim()
    .slice(0, 4000);
}

export default function MermaidCanvas({ chart, className }: Props) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const safe = clientSanitize(chart || "");
      if (!safe) {
        setSvg("");
        return;
      }
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          themeVariables: {
            primaryColor: "#122018",
            primaryTextColor: "#e8eef6",
            primaryBorderColor: "#34d399",
            lineColor: "#64748b",
            secondaryColor: "#0c1118",
            tertiaryColor: "#1a2433",
            background: "#0c1118",
            fontFamily: "IBM Plex Mono, monospace",
          },
        });
        const { svg: rendered } = await mermaid.render(`mmd-${reactId}-${Date.now()}`, safe);
        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
          setSvg("");
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/60 to-transparent" />
      {error ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-slate-400">
          {clientSanitize(chart)}
        </pre>
      ) : svg ? (
        <div
          className="flex min-h-[220px] items-center justify-center p-4 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 font-mono text-xs text-slate-500">
          <span className="h-1.5 w-24 animate-pulse rounded-full bg-signal/30" />
          Architecture canvas idle
        </div>
      )}
    </div>
  );
}
