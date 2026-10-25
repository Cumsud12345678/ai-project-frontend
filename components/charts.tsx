"use client";
import { useId } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Point = { label: string; title: string; value: number };
export const chartColor = (i: number) => `var(--chart-${(i % 5) + 1})`;

export const compact = (n: number, t: (k: string) => string) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)} ${t("mln")}` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)} ${t("min")}` : String(n);

function Tip({ active, payload, unit, fmt }: { active?: boolean; payload?: { payload: Point }[]; unit: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{p.title}</p>
      <p className="text-sm font-semibold tabular-nums">{fmt(p.value)} <span className="font-normal text-muted-foreground">{unit}</span></p>
    </div>
  );
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

/** Gradientli sahə (area) və ya sütun qrafiki. `data` boş olmamalıdır (çağıran yoxlayır). */
export function TrendChart({ data, color = "var(--chart-1)", unit, kind = "area", height = 240, fmt, tick }: {
  data: Point[]; color?: string; unit: string; kind?: "area" | "bar"; height?: number; fmt: (n: number) => string; tick: (n: number) => string;
}) {
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const common = { data, margin: { top: 8, right: 8, left: -8, bottom: 0 } };
  const grid = <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />;
  const x = <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />;
  const y = <YAxis tick={axis} tickLine={false} axisLine={false} width={58} allowDecimals={false} tickFormatter={tick} />;
  const tip = <Tooltip content={<Tip unit={unit} fmt={fmt} />} cursor={{ stroke: color, strokeOpacity: 0.25, fill: color, fillOpacity: 0.06 }} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}{x}{y}{tip}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)", fill: color }} />
          </AreaChart>
        ) : (
          <BarChart {...common}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            {grid}{x}{y}{tip}
            <Bar dataKey="value" fill={`url(#${gid})`} radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Pay diaqramı (donut), ortada yazı ilə. Rənglər sıra ilə --chart-1..5. */
export function Donut({ data, center, sub, size = 190 }: { data: { name: string; value: number }[]; center: string; sub: string; size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="96%" paddingAngle={data.length > 1 ? 3 : 0} cornerRadius={5} stroke="none" isAnimationActive>
            {data.map((_, i) => <Cell key={i} fill={chartColor(i)} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <p className="text-xl font-semibold tabular-nums">{center}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/** Dairəvi irəliləyiş göstəricisi (aylıq limit). */
export function Ring({ pct, color, label, size = 168 }: { pct: number; color: string; label: string; size?: number }) {
  const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--muted)" strokeWidth="13" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} style={{ transition: "stroke-dasharray .6s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="text-3xl font-semibold tabular-nums">{Math.round(p)}%</p>
      </div>
    </div>
  );
}
