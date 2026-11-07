"use client";
// Sənin API-nə bağlantı (ünvan, autentifikasiya, açar): Əməliyyatlar və Müştəri məlumatı səhifələrində eyni modal.
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export type ConnValue = { baseUrl: string; authType: string; authName: string; secret: string };
export type ConnInput = { baseUrl: string; apiSecret?: string; auth: { type: string; name?: string } };

export const connInput = (v: ConnValue, named: string[]): ConnInput => ({
  baseUrl: v.baseUrl.trim(), ...(v.secret.trim() && { apiSecret: v.secret.trim() }),
  auth: v.authType === "none" ? { type: "none" } : { type: v.authType, ...(named.includes(v.authType) && { name: v.authName.trim() }) },
});

export function ConnectionModal({ open, onClose, initial, types, named, hasSecret, description, hint, saving, error, onSave, saveLabel }: {
  open: boolean; onClose: () => void; initial: ConnValue; types: { value: string; label: string }[]; named: string[]; hasSecret: boolean;
  description: string; hint?: string; saving: boolean; error?: string; onSave: (v: ConnValue) => void; saveLabel?: string;
}) {
  const { t } = useI18n();
  const [v, setV] = useState(initial);
  useEffect(() => { if (open) setV(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<ConnValue>) => setV((x) => ({ ...x, ...p }));
  return (
    <Modal open={open} onClose={onClose} busy={saving} title={t("API bağlantısı")} description={description}
      footer={<><Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Ləğv et")}</Button><Button type="submit" form="conn-form" disabled={saving || !v.baseUrl.trim()}>{saving ? t("Yoxlanılır…") : saveLabel ?? t("Saxla")}</Button></>}>
      <form id="conn-form" onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1"><Label htmlFor="cn-base">{t("API ünvanı (https)")}</Label><Input id="cn-base" value={v.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://api.saytin.az" required /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1"><Label htmlFor="cn-at">{t("Autentifikasiya")}</Label>
            <select id="cn-at" value={v.authType} onChange={(e) => set({ authType: e.target.value })} className="h-10 rounded-md border border-border bg-card px-3 text-sm">{types.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
          {named.includes(v.authType) && <div className="flex flex-col gap-1"><Label htmlFor="cn-an">{t("Ad")}</Label><Input id="cn-an" value={v.authName} onChange={(e) => set({ authName: e.target.value })} /></div>}
          {v.authType !== "none" && <div className="flex flex-col gap-1"><Label htmlFor="cn-sec">{t("API açarı")}</Label><Input id="cn-sec" type="password" autoComplete="off" value={v.secret} onChange={(e) => set({ secret: e.target.value })} placeholder={hasSecret ? t("Saxlanıb, dəyişmək üçün yeni yaz") : ""} /></div>}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}

/** Quraşdırma addımlarının kiçik kartları (✓ hazır / addım düyməsi) */
export function SetupSteps({ steps }: { steps: { title: string; done: boolean; action?: { label: string; run: () => void } }[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${s.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>{s.done ? "✓" : i + 1}</span>
          <span className="min-w-0 flex-1 text-sm font-medium">{s.title}</span>
          {!s.done && s.action && <button type="button" onClick={s.action.run} className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline">{s.action.label}</button>}
        </li>
      ))}
    </ol>
  );
}
