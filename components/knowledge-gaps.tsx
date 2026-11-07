"use client";
// Bilik boşluqları: köməkçinin cavab tapmadığı suallar. Cavabı bir dəfə yaz → sual-cavab kimi bilik bazasına düşür
// və köməkçi oxşar suallara özü cavab verir; sual siyahıdan çıxır.
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, EyeOff, MessageSquarePlus } from "lucide-react";
import { deleteUnanswered, kbAddQa, type UnansweredRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

function GapRow({ r, canAnswer, onDone }: { r: UnansweredRow; canAnswer: boolean; onDone: () => void }) {
  const { t, short } = useI18n();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1"><p className="break-words text-sm">“{r.message}”</p><p className="text-xs text-muted-foreground">{short(r.at)}</p></div>
        {!open && (
          <div className="flex gap-1.5">
            {canAnswer && <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)}><MessageSquarePlus size={14} aria-hidden />{t("Cavab ver")}</Button>}
            <Button size="sm" variant="ghost" disabled={busy} title={t("Gizlət")} aria-label={t("Gizlət")} onClick={() => run(() => deleteUnanswered(r.id), t("Gizlədildi."))}><EyeOff size={14} aria-hidden /></Button>
          </div>
        )}
      </div>
      {open && (
        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const a = answer.trim(); if (a) void run(async () => { await kbAddQa([r.message.slice(0, 200)], a); await deleteUnanswered(r.id).catch(() => {}); }, t("Öyrədildi. Köməkçi oxşar suallara bu cavabla cavab verəcək.")); }}>
          <Textarea autoFocus rows={3} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label={t("Cavab")} placeholder={t("Düzgün cavabı yaz. Köməkçi bunu öyrənəcək və oxşar suallarda işlədəcək.")} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !answer.trim()}><Check size={14} aria-hidden />{t("Öyrət")}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => { setOpen(false); setAnswer(""); }}>{t("Ləğv et")}</Button>
          </div>
        </form>
      )}
    </li>
  );
}

export function KnowledgeGaps({ rows, canAnswer, reload, limit }: { rows: UnansweredRow[]; canAnswer: boolean; reload: () => void; limit?: number }) {
  const { t } = useI18n();
  const list = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="flex flex-col gap-2">
      {!canAnswer && <p className="text-xs text-muted-foreground">{t("Sualları bilik bazasına cavab kimi əlavə etmək üçün çatın rejimində “Şirkət haqqında suallar” aktiv olmalıdır.")} <Link href="/knowledge" className="text-primary underline">{t("Bilik bazası")}</Link></p>}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">{list.map((r) => <GapRow key={r.id} r={r} canAnswer={canAnswer} onDone={reload} />)}</ul>
      {limit && rows.length > limit && <Link href="/inbox?f=unanswered" className="self-start text-sm text-primary underline">{t("Hamısına bax ({n})", { n: rows.length })}</Link>}
    </div>
  );
}
