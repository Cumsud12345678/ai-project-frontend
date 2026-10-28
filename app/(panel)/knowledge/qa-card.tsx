"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { kbAddQa, kbDelete, kbUpdateQa, type KbInfo, type KbSource } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

/** Bir cütlüyü yazmaq/dəyişmək forması: hər sətir bir sual ifadəsidir. */
function QaForm({ info, initial, onDone, onCancel }: { info: KbInfo; initial?: KbSource; onDone: () => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const maxQ = info.limits.qaQuestions ?? 8, maxA = info.limits.qaAnswerChars ?? 2000;
  const [questions, setQuestions] = useState((initial?.questions ?? []).join("\n"));
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const qs = lines(questions);
  const ok = qs.length > 0 && qs.length <= maxQ && answer.trim().length > 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    try {
      if (initial) await kbUpdateQa(initial.id, qs, answer.trim()); else await kbAddQa(qs, answer.trim());
      toast.success(initial ? t("Saxlandı.") : t("Cütlük əlavə edildi."));
      if (!initial) { setQuestions(""); setAnswer(""); }
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  const id = initial ? `qa-${initial.id}` : "qa-new";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-q`}>{t("Sual (hər sətirdə bir ifadə)")}</Label>
        <Textarea id={`${id}-q`} rows={3} value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder={t("Çatdırılma neçə günə olur?\nSifariş nə vaxt çatır?")} />
        <p className="text-xs text-muted-foreground">{t("Eyni sualı müxtəlif sözlərlə yaz ki, bot hamısını tanısın. Ən çox {n} ifadə.", { n: maxQ })}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-a`}>{t("Cavab")}</Label>
        <Textarea id={`${id}-a`} rows={4} maxLength={maxA} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t("Bakı daxilində 2 iş günü, bölgələrə 4 iş günü.")} />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t("Ləğv et")}</Button>}
        <Button disabled={!ok || busy}>{busy ? t("Saxlanır…") : initial ? t("Saxla") : t("Əlavə et")}</Button>
      </div>
    </form>
  );
}

function QaRow({ s, info, onChange }: { s: KbSource; info: KbInfo; onChange: () => void }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true);
    try { await kbDelete(s.id); toast.success(t("Silindi.")); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); setConfirm(false); }
  }
  if (edit) return <li className="px-4 py-3"><QaForm info={info} initial={s} onDone={() => { setEdit(false); onChange(); }} onCancel={() => setEdit(false)} /></li>;
  const qs = s.questions ?? [];
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{qs[0] ?? s.name}{qs.length > 1 && <span className="ml-2 text-xs font-normal text-muted-foreground">{t("+{n} ifadə", { n: qs.length - 1 })}</span>}</p>
        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{s.answer}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setEdit(true)} aria-label={t("Dəyiş")}><Pencil size={14} aria-hidden /><span className="hidden sm:inline">{t("Dəyiş")}</span></Button>
        {confirm ? (
          <>
            <Button size="sm" variant="destructive" disabled={busy} onClick={del}>{t("Bəli, sil")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t("Ləğv et")}</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm(true)} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
        )}
      </div>
    </li>
  );
}

export function QaCard({ info, onChange }: { info: KbInfo; onChange: () => void }) {
  const { t } = useI18n();
  const pairs = info.sources.filter((s) => s.type === "qa");
  const max = info.limits.qa ?? 300;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Dəqiq cavablar")} <span className="text-sm font-normal text-muted-foreground">({pairs.length}/{max})</span></CardTitle>
        <CardDescription>{t("Vacib suallara özün cavab yaz. İstifadəçinin sualı yazdığın suallardan birinə uyğun gələndə bot cavabı olduğu kimi, süni intellektsiz və pulsuz verir. Uyğun gəlməyən suallara adi qaydada cavab verilir.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pairs.length < max ? <QaForm info={info} onDone={onChange} /> : <p className="text-sm text-muted-foreground">{t("Ən çox {n} cütlük əlavə edə bilərsiniz.", { n: max })}</p>}
      </CardContent>
      {pairs.length > 0 && <ul className="divide-y divide-border border-t border-border">{pairs.map((s) => <QaRow key={s.id} s={s} info={info} onChange={onChange} />)}</ul>}
    </Card>
  );
}
