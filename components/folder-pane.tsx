"use client";
// Qovluqlu səhifə çərçivəsi (Müraciətlər, Müştərilər): solda qruplanmış qovluqlar saylarla, telefonda üfüqi düymələr.
import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useResizable } from "@/components/resizable";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type FolderItem<T extends string> = { id: T; label: string; icon: LucideIcon; count?: number; color?: string; /** sayı qırmızı nişanla göstər (diqqət tələb edir) */ alert?: boolean };
export type FolderGroup<T extends string> = { id: string; label: string; items: FolderItem<T>[] };

export function PaneHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4"><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>{children}</div>;
}

/** Başlıqlı, sürüşən məzmun sahəsi */
export function Pane({ title, extra, wide, children }: { title: string; extra?: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PaneHeader title={title}>{extra}</PaneHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6"><div className={cn("mx-auto flex flex-col gap-4", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</div></div>
    </div>
  );
}

export function FolderPane<T extends string>({ title, groups, value, onPick, footer, banner, children }: {
  title: string; groups: FolderGroup<T>[]; value: T; onPick: (id: T) => void; footer?: React.ReactNode; banner?: React.ReactNode; children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [closed, setClosed] = useState<string[]>([]);
  const navW = useResizable("folders", 240, 190, 360, "right");
  const all = groups.flatMap((g) => g.items);
  return (
    <div className="flex h-full min-h-0">
      <nav aria-label={t("Qovluqlar")} style={navW.style} className="relative hidden w-[var(--pane-w)] shrink-0 flex-col border-r border-border bg-shell/50 md:flex">{navW.handle}
        <PaneHeader title={title} />
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((g) => {
            const shut = closed.includes(g.id);
            return (
              <div key={g.id} className="mb-2">
                <button type="button" onClick={() => setClosed((x) => (shut ? x.filter((y) => y !== g.id) : [...x, g.id]))} aria-expanded={!shut}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-semibold hover:bg-card/60">
                  {g.label}<ChevronDown size={15} aria-hidden className={cn("text-muted-foreground transition-transform", shut && "-rotate-90")} />
                </button>
                {!shut && (
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {g.items.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => onPick(f.id)} aria-current={value === f.id ? "page" : undefined}
                          className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors", value === f.id ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-border/70" : "text-muted-foreground hover:bg-card/60 hover:text-foreground")}>
                          <f.icon size={15} aria-hidden className={cn("shrink-0", f.color)} />
                          <span className="min-w-0 flex-1 truncate text-left">{f.label}</span>
                          {typeof f.count === "number" && <span className={cn("text-xs tabular-nums", f.alert && f.count > 0 ? "rounded-full bg-destructive px-1.5 font-semibold text-white" : "text-muted-foreground")}>{f.count}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        {footer && <div className="border-t border-border p-2">{footer}</div>}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Telefon: qovluqlar üfüqi siyahıda */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2 md:hidden" role="tablist" aria-label={t("Qovluqlar")}>
          {all.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={value === f.id} onClick={() => onPick(f.id)}
              className={cn("shrink-0 cursor-pointer rounded-full border px-3 py-1 text-sm", value === f.id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>
              {f.label}{typeof f.count === "number" && f.count > 0 ? ` ${f.count}` : ""}
            </button>
          ))}
        </div>
        {banner}
        {/* Seçilmiş bölmə bütün eni tutur: əks halda sağda boş zolaq qalırdı */}
        <div className="flex min-h-0 min-w-0 flex-1 *:min-w-0 *:flex-1">{children}</div>
      </div>
    </div>
  );
}
