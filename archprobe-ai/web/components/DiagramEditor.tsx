"use client";

import { useEffect, useRef, useState } from "react";
import MermaidCanvas from "@/components/MermaidCanvas";

const PALETTE = [
  { label: "Client", id: "Client", shape: (id: string) => `${id}[Client]` },
  { label: "Load balancer", id: "LB", shape: (id: string) => `${id}[Load balancer]` },
  { label: "Service", id: "Svc", shape: (id: string) => `${id}[Service]` },
  { label: "Cache", id: "Cache", shape: (id: string) => `${id}[(Cache)]` },
  { label: "Database", id: "DB", shape: (id: string) => `${id}[(Database)]` },
  { label: "Queue", id: "Queue", shape: (id: string) => `${id}[[Queue]]` },
  { label: "Workers", id: "Workers", shape: (id: string) => `${id}[Workers]` },
  { label: "Object store", id: "Blob", shape: (id: string) => `${id}[(Object store)]` },
];

export const STARTER_DIAGRAM = "graph TD\n  Client[Client] --> API[API]\n  API --> DB[(Database)]";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function DiagramEditor({ value, onChange }: Props) {
  const [preview, setPreview] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPreview(value), 500);
    return () => clearTimeout(t);
  }, [value]);

  function addNode(base: string, shape: (id: string) => string) {
    let id = base;
    let n = 2;
    while (new RegExp(`\\b${id}\\b`).test(value)) id = `${base}${n++}`;
    const body = value.trim() || "graph TD";
    onChange(`${body}\n  ${shape(id)}`);
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => addNode(p.id, p.shape)}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
          >
            + {p.label}
          </button>
        ))}
      </div>
      <MermaidCanvas chart={preview} dark className="min-h-[220px] flex-1 rounded-xl border border-white/10 bg-night-2" />
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/40">
          <span>Mermaid source · connect nodes with A --&gt; B</span>
          <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noreferrer" className="hover:text-white/70">
            Syntax help
          </a>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 4000))}
          rows={7}
          spellCheck={false}
          className="scroll-thin w-full resize-y rounded-lg border border-white/10 bg-night p-3 font-mono text-xs leading-relaxed text-white/85 outline-none focus:border-white/30"
        />
      </div>
    </div>
  );
}
