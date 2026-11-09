"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Aç/bağla açarı (role="switch"). Topcuq hər iki tərəfdən eyni 3px məsafədədir (simmetrik), açıq vəziyyət yaşıldır. */
export function Switch({ checked, onChange, id, label, labelledBy, describedBy, disabled }: { checked: boolean; onChange: (v: boolean) => void; id?: string; label?: string; labelledBy?: string; describedBy?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-block h-6 w-[42px] shrink-0 cursor-pointer rounded-full p-0 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-zinc-300")}>
      <span aria-hidden className={cn("absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-out", checked ? "translate-x-[18px]" : "translate-x-0")} />
    </button>
  );
}

/** Başlıq + izah + açar: istifadəçi nəyi dəyişdiyini və cari vəziyyəti dərhal görür. */
export function SwitchRow({ checked, onChange, title, description, on, off, className }: { checked: boolean; onChange: (v: boolean) => void; title: string; description?: string; on: string; off: string; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4", className)}>
      <div className="min-w-0">
        <p id={`${id}-t`} className="text-sm font-medium">{title}</p>
        {description && <p id={`${id}-d`} className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span aria-hidden className={cn("text-xs font-semibold", checked ? "text-emerald-700" : "text-muted-foreground")}>{checked ? on : off}</span>
        <Switch checked={checked} onChange={onChange} labelledBy={`${id}-t`} describedBy={description ? `${id}-d` : undefined} />
      </div>
    </div>
  );
}
