import type { LucideIcon } from "lucide-react";

/**
 * Göstərici kartı: sadə ağ kart, boz ikon (rəngli ikonlar paneli "hazır şablon" kimi göstərirdi).
 * `tone` köhnə çağırışlarla uyğunluq üçün qalır, rəngə təsir etmir.
 */
export function StatTile({ icon: Icon, label, value, hint }: { icon: LucideIcon; tone?: 1 | 2 | 3 | 4 | 5; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon size={15} aria-hidden className="shrink-0" /><span className="truncate">{label}</span></p>
      <p className="text-2xl font-semibold leading-tight tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}
