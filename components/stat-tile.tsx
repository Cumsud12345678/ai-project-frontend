import type { LucideIcon } from "lucide-react";

/** Rəngli ikonlu göstərici kartı. `tone`: globals.css-dəki --chart-N rəngi. */
export function StatTile({ icon: Icon, tone = 1, label, value, hint }: { icon: LucideIcon; tone?: 1 | 2 | 3 | 4 | 5; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  const c = `var(--chart-${tone})`;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
      </div>
    </div>
  );
}
