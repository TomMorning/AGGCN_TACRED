"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  chart: string;
  className?: string;
  dark?: boolean;
};

function clientSanitize(chart: string) {
  return chart
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .split("\n")
    .filter((l) => !/^\s*%%\{/.test(l) && !/^\s*click\s/i.test(l))
    .join("\n")
    .trim()
    .slice(0, 4000);
}

export default function MermaidCanvas({ chart, className, dark = false }: Props) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

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
          securityLevel: "strict",
          theme: "base",
          themeVariables: dark
            ? {
                primaryColor: "#1F232A",
                primaryTextColor: "#E8EAED",
                primaryBorderColor: "#3B4250",
                lineColor: "#6B7280",
                background: "#171A1F",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
              }
            : {
                primaryColor: "#FFFFFF",
                primaryTextColor: "#14161A",
                primaryBorderColor: "#CFCAC0",
                lineColor: "#9A968E",
                background: "#FFFFFF",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
              },
        });
        const { svg: rendered } = await mermaid.render(`mmd-${reactId}-${Date.now()}`, safe);
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSvg("");
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId, dark]);

  return (
    <div className={`relative overflow-auto ${className || ""}`}>
      {failed ? (
        <pre className={`whitespace-pre-wrap p-4 font-mono text-xs ${dark ? "text-white/50" : "text-muted"}`}>
          {clientSanitize(chart)}
        </pre>
      ) : svg ? (
        <div
          className="flex min-h-[220px] items-center justify-center p-4 [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className={`flex min-h-[220px] items-center justify-center text-xs ${dark ? "text-white/40" : "text-muted"}`}>
          Diagram appears after your first answer
        </div>
      )}
    </div>
  );
}
