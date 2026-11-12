"use client";
// Operator cavablarından öyrənmə: canlı söhbət bağlananda AI operatorun verdiyi ümumi məlumatları (qiymət, çatdırılma, qayda...)
// sual-cavab təklifi kimi çıxarır. Sahib baxır, lazım olsa düzəldir və bir kliklə bilik bazasına əlavə edir.
import { useCallback, useEffect, useState } from "react";
import { Check, GraduationCap, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { acceptKbSuggestion, deleteKbSuggestion, getKbSuggestions, type KbSuggestion } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

function Row({ s, onDone }: { s: KbSuggestion; onDone: (id: string) => void }) {
  const { t, short } = useI18n();
  const [edit, setEdit] = useState(false);
  const [q, setQ] = useState(s.question);
  const [a, setA] = useState(s.answer);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); onDone(s.id); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const accept = () => run(() => acceptKbSuggestion(s.id, { questions: [q.trim()], answer: a.trim() }), t("Biliyə əlavə olundu. Köməkçi oxşar suallara bu cavabla cavab verəcək."));
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm">
      {edit ? (
        <div className="flex flex-col gap-2">
          <Input value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} aria-label={t("Müştərinin sualı")} />
          <Textarea rows={3} maxLength={2000} value={a} onChange={(e) => setA(e.target.value)} aria-label={t("Cavab")} />
        </div>
      ) : (
        <div className="min-w-0">
          <p className="break-words font-medium">“{s.question}”</p>
          <p className="break-words text-muted-foreground">{s.answer}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{short(s.at)}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" disabled={busy || q.trim().length < 3 || a.trim().length < 2} onClick={accept}><Check size={14} aria-hidden />{t("Biliyə əlavə et")}</Button>
        {!edit && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEdit(true)}><Pencil size={14} aria-hidden />{t("Düzəlt")}</Button>}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => deleteKbSuggestion(s.id), t("Rədd edildi."))}><X size={14} aria-hidden />{t("Rədd et")}</Button>
      </div>
    </li>
  );
}

/** Təklif yoxdursa heç nə göstərmir */
export function KbSuggestions({ limit }: { limit?: number }) {
  const { t } = useI18n();
  const [items, setItems] = useState<KbSuggestion[] | null>(null);
  const load = useCallback(() => { getKbSuggestions().then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  useEffect(load, [load]);
  if (!items?.length) return null;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><GraduationCap size={18} aria-hidden />{t("Operator cavablarından təkliflər")} <span className="font-normal text-muted-foreground">{items.length}</span></h2>
        <p className="text-sm text-muted-foreground">{t("Canlı söhbətlərdə operatorun verdiyi məlumatlar. Təsdiqləsən, köməkçi növbəti dəfə özü cavab verəcək.")}</p>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {shown.map((s) => <Row key={s.id} s={s} onDone={(id) => setItems((xs) => (xs ?? []).filter((x) => x.id !== id))} />)}
      </ul>
      {limit && items.length > limit && <p className="text-xs text-muted-foreground">{t("Daha {n} təklif Bilik bazası səhifəsindədir.", { n: items.length - limit })}</p>}
    </section>
  );
}
