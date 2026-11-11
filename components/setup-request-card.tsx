"use client";
import { useEffect, useState } from "react";
import { CircleCheck, Clock, Headset, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cancelSetupRequest, getSetupRequest, sendSetupRequest, type SetupChannel, type SetupForm, type SetupRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const EMPTY: SetupForm = { businessName: "", website: "", phone: "", description: "", salesScript: "", faq: "", channels: [] };

/** "Qurulumu bizə həvalə et": texniki işi komandamız görür, müştəri yalnız biznes məlumatını yazır */
export function SetupRequestCard({ businessName }: { businessName?: string }) {
  const { t, short } = useI18n();
  const [req, setReq] = useState<SetupRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<SetupForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getSetupRequest().then((r) => setReq(r.request)).catch(() => setReq(null)); }, []);
  if (req === undefined) return null;

  const edit = () => { setF(req ? { businessName: req.businessName, website: req.website, phone: req.phone, description: req.description, salesScript: req.salesScript, faq: req.faq, channels: req.channels } : { ...EMPTY, businessName: businessName ?? "" }); setOpen(true); };
  const toggle = (c: SetupChannel) => setF((x) => ({ ...x, channels: x.channels.includes(c) ? x.channels.filter((y) => y !== c) : [...x.channels, c] }));
  const valid = f.businessName.trim().length >= 2 && f.phone.replace(/\D/g, "").length >= 7 && f.description.trim().length >= 50;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try { const r = await sendSetupRequest(f); setReq(r.request); setOpen(false); toast.success(t("Sorğun göndərildi. Hazır olanda e-poçt alacaqsan.")); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true);
    try { await cancelSetupRequest(); setReq(null); toast.success(t("Sorğu ləğv olundu.")); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  const status = req?.status;
  const chLabel: Record<SetupChannel, string> = { site: t("Sayt"), telegram: "Telegram", whatsapp: "WhatsApp" };

  return (
    <>
      <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-card p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">{status === "done" ? <CircleCheck size={19} className="text-emerald-600" aria-hidden /> : status ? <Clock size={19} aria-hidden /> : <Headset size={19} aria-hidden />}</span>
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-semibold">{status === "done" ? t("Köməkçin quruldu") : status === "in_progress" ? t("Komandamız köməkçini qurur") : status === "new" ? t("Qurulum sorğun göndərilib") : t("Vaxtın yoxdur? Qurulumu bizə həvalə et")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "done" ? t("Məlumatın bilik bazasına əlavə olundu. Sınaq söhbətində yoxla, sonra saytına və ya Telegram/WhatsApp-a qoş.")
              : status ? t("Göndərildi: {d}. Hazır olanda sənə e-poçt gələcək, lazım olsa zəng edəcəyik.", { d: short(req!.createdAt) })
              : t("Pulsuzdur. Biznesin, məhsul və qiymətlərin haqqında yaz: AI köməkçini biz öyrədib quraq, sən yalnız yoxla.")}
          </p>
          {req?.adminNote && status !== "done" && <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">{req.adminNote}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {status !== "in_progress" && <Button variant={status ? "outline" : "default"} onClick={edit}><Wrench size={15} aria-hidden />{status === "done" ? t("Yeni sorğu") : status ? t("Dəyişdir") : t("Qurulumu həvalə et")}</Button>}
          {status === "new" && <Button variant="ghost" onClick={cancel} disabled={busy}>{t("Ləğv et")}</Button>}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} busy={busy} title={t("Qurulumu bizə həvalə et")} description={t("Nə qədər ətraflı yazsan, köməkçi o qədər dəqiq cavab verəcək. Yazdıqların AI-ın bilik bazasına düşür.")}
        footer={<><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="setup-req" disabled={!valid || busy}>{busy ? t("Göndərilir…") : t("Göndər")}</Button></>}>
        <form id="setup-req" className="flex flex-col gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1"><Label htmlFor="sr-name">{t("Biznesin adı")}</Label><Input id="sr-name" value={f.businessName} maxLength={120} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="sr-phone">{t("Sizinlə əlaqə üçün telefon")}</Label><Input id="sr-phone" type="tel" value={f.phone} maxLength={40} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+994 50 123 45 67" /></div>
          </div>
          <div className="flex flex-col gap-1"><Label htmlFor="sr-site">{t("Sayt (yoxdursa boş burax)")}</Label><Input id="sr-site" value={f.website} maxLength={200} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="magaza.az" /></div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sr-desc">{t("Biznes, məhsul/xidmətlər və qiymətlər")}</Label>
            <Textarea id="sr-desc" rows={6} value={f.description} maxLength={6000} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t("Nə satırsınız, qiymətlər, çatdırılma və ödəniş, iş saatları, ünvan, zəmanət...")} />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{f.description.trim().length < 50 ? t("ən azı 50 simvol") : `${f.description.length}/6000`}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sr-script">{t("Satış ssenarisi (istəyə bağlı)")}</Label>
            <Textarea id="sr-script" rows={3} value={f.salesScript} maxLength={3000} onChange={(e) => setF({ ...f, salesScript: e.target.value })} placeholder={t("Müştəri ilə necə danışılsın: əvvəl nəyi soruşmalı, nəyi təklif etməli, sifarişi necə bağlamalı")} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sr-faq">{t("Tez-tez verilən suallar (istəyə bağlı)")}</Label>
            <Textarea id="sr-faq" rows={3} value={f.faq} maxLength={6000} onChange={(e) => setF({ ...f, faq: e.target.value })} placeholder={t("Sual və cavablar: Kartla ödəmək olar? Bəli...")} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("Harada işləsin?")}</legend>
            <div className="flex flex-wrap gap-4">
              {(["site", "whatsapp", "telegram"] as SetupChannel[]).map((c) => <label key={c} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.channels.includes(c)} onChange={() => toggle(c)} />{chLabel[c]}</label>)}
            </div>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
