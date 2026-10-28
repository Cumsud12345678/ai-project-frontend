"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { kbAddProc, kbDelete, kbUpdateProc, type KbInfo, type KbSource } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

/** Ssenari yazmaq/dəyişmək forması: ad, nə vaxt işləməli (hər sətir bir ifadə) və addımlar. */
function ProcForm({ info, initial, onDone, onCancel }: { info: KbInfo; initial?: KbSource; onDone: () => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const maxT = info.limits.procTriggers ?? 6, maxS = info.limits.procStepsChars ?? 2500, maxN = info.limits.procNameChars ?? 80;
  const [name, setName] = useState(initial?.name ?? "");
  const [triggers, setTriggers] = useState((initial?.triggers ?? []).join("\n"));
  const [steps, setSteps] = useState(initial?.steps ?? "");
  const [busy, setBusy] = useState(false);
  const tr = lines(triggers);
  const ok = name.trim().length > 1 && tr.length > 0 && tr.length <= maxT && steps.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    try {
      if (initial) await kbUpdateProc(initial.id, name.trim(), tr, steps.trim()); else await kbAddProc(name.trim(), tr, steps.trim());
      toast.success(initial ? t("Saxlandı.") : t("Ssenari əlavə edildi."));
      if (!initial) { setName(""); setTriggers(""); setSteps(""); }
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  const id = initial ? `pr-${initial.id}` : "pr-new";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-n`}>{t("Ssenarinin adı")}</Label>
        <Input id={`${id}-n`} value={name} maxLength={maxN} onChange={(e) => setName(e.target.value)} placeholder={t("Məhsulun qaytarılması")} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-t`}>{t("Nə vaxt işləsin (hər sətirdə bir ifadə)")}</Label>
        <Textarea id={`${id}-t`} rows={3} value={triggers} onChange={(e) => setTriggers(e.target.value)} placeholder={t("Məhsulu qaytarmaq istəyirəm\nPulumu geri qaytarın")} />
        <p className="text-xs text-muted-foreground">{t("Müştəri belə bir şey yazanda ssenari işə düşür. Ən çox {n} ifadə.", { n: maxT })}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-s`}>{t("Addımlar")}</Label>
        <Textarea id={`${id}-s`} rows={6} maxLength={maxS} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={t("1. Sifariş nömrəsini soruş.\n2. Məhsulun açılıb-açılmadığını soruş.\n3. 14 gün keçməyibsə qaytarma formasını göndər.")} />
        <p className="text-xs text-muted-foreground">{t("Sadə dildə yaz. Bot addımları söhbət tərzində, sırayla aparacaq və burada olmayan şərt uydurmayacaq.")}</p>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>{t("Ləğv et")}</Button>}
        <Button disabled={!ok || busy}>{busy ? t("Saxlanır…") : initial ? t("Saxla") : t("Əlavə et")}</Button>
      </div>
    </form>
  );
}

function ProcRow({ s, info, onChange }: { s: KbSource; info: KbInfo; onChange: () => void }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true);
    try { await kbDelete(s.id); toast.success(t("Silindi.")); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); setConfirm(false); }
  }
  if (edit) return <li className="px-4 py-3"><ProcForm info={info} initial={s} onDone={() => { setEdit(false); onChange(); }} onCancel={() => setEdit(false)} /></li>;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{s.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{(s.triggers ?? []).join(" · ")}</p>
        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{s.steps}</p>
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

/** Ssenarilər: sahib sadə dildə addım-addım qayda yazır (qaytarma, ləğv, rezerv); bot müştəri ilə bu addımlarla gedir. */
export function ProcCard({ info, onChange }: { info: KbInfo; onChange: () => void }) {
  const { t } = useI18n();
  const procs = info.sources.filter((s) => s.type === "proc");
  const max = info.limits.proc ?? 20;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Ssenarilər")} <span className="text-sm font-normal text-muted-foreground">({procs.length}/{max})</span></CardTitle>
        <CardDescription>{t("Qaytarma, sifarişin ləğvi, rezerv kimi addım-addım proseslər üçün qayda yaz. Müştəri bu mövzuda yazanda bot addımlarla irəliləyir: lazım olan məlumatı soruşur və qaydanı pozmur. Tək cavab kifayətdirsə “Dəqiq cavablar”dan istifadə et.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {procs.length < max ? <ProcForm info={info} onDone={onChange} /> : <p className="text-sm text-muted-foreground">{t("Ən çox {n} ssenari əlavə edə bilərsiniz.", { n: max })}</p>}
      </CardContent>
      {procs.length > 0 && <ul className="divide-y divide-border border-t border-border">{procs.map((s) => <ProcRow key={s.id} s={s} info={info} onChange={onChange} />)}</ul>}
    </Card>
  );
}
