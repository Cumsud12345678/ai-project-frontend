"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Aç/bağla açarı (role="switch"). */
export function Switch({ checked, onChange, id, label, labelledBy, describedBy }: { checked: boolean; onChange: (v: boolean) => void; id?: string; label?: string; labelledBy?: string; describedBy?: string }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} aria-labelledby={labelledBy} aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        checked ? "bg-primary" : "bg-slate-300")}>
      <span aria-hidden className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
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
        <span aria-hidden className={cn("text-xs font-semibold", checked ? "text-primary" : "text-muted-foreground")}>{checked ? on : off}</span>
        <Switch checked={checked} onChange={onChange} labelledBy={`${id}-t`} describedBy={description ? `${id}-d` : undefined} />
      </div>
    </div>
  );
}
