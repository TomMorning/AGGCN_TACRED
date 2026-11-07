"use client";

import { useState } from "react";

const LEVELS = [
  { key: "senior", label: "Senior (L5)", comp: 320_000 },
  { key: "staff", label: "Staff (L6)", comp: 480_000 },
];

const PRICES: Record<number, number> = { 1: 29, 3: 79, 6: 149 };

export default function RoiCalculator() {
  const [level, setLevel] = useState("staff");
  const [months, setMonths] = useState(3);
  const comp = LEVELS.find((l) => l.key === level)!.comp;
  const [salary, setSalary] = useState(comp);
  const price = PRICES[months];
  const pct = (price / salary) * 100;
  const hours = (price / (salary / 2000)).toFixed(1);

  return (
    <div className="card grid gap-8 p-6 md:grid-cols-2 md:p-8">
      <div>
        <p className="eyebrow">What one offer is worth</p>
        <h3 className="mt-2 font-display text-3xl leading-tight md:text-4xl">The math on prep is lopsided.</h3>
        <div className="mt-6 flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => {
                setLevel(l.key);
                setSalary(l.comp);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                level === l.key ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <label className="mt-6 block">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Year-one total comp</span>
            <span className="font-mono">${salary.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={150_000}
            max={900_000}
            step={10_000}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="mt-2 w-full accent-[#0E7A61]"
          />
        </label>
        <div className="mt-5">
          <p className="text-sm text-ink-soft">Months of prep</p>
          <div className="mt-2 flex gap-2">
            {[1, 3, 6].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  months === m ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft"
                }`}
              >
                {m} mo
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">Comp figures are illustrative. Drag to match your offer.</p>
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-paper p-6">
        <p className="text-sm text-muted">{months} months of ArchProbe Pro</p>
        <p className="font-display text-6xl">${price}</p>
        <div className="my-6 h-px bg-line" />
        <p className="font-display text-4xl text-brand">{pct.toFixed(3)}%</p>
        <p className="mt-1 text-sm text-ink-soft">
          of year-one pay — about {hours} hours on the job. One leveled-up offer pays for it on day one.
        </p>
      </div>
    </div>
  );
}
