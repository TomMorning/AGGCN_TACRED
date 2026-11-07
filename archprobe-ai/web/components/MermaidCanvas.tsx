"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  chart: string;
  className?: string;
};

export default function MermaidCanvas({ chart, className }: Props) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!chart?.trim()) {
        setSvg("");
        return;
      }
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
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
        const { svg: rendered } = await mermaid.render(`mmd-${reactId}-${Date.now()}`, chart);
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
        <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-rose-300/90">{chart}</pre>
      ) : svg ? (
        <div
          className="flex min-h-[220px] items-center justify-center p-4 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex min-h-[220px] items-center justify-center font-mono text-xs text-slate-500">
          Waiting for architecture signal…
        </div>
      )}
    </div>
  );
}
