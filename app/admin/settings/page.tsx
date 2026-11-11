"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, CircleCheck, CircleX, PauseCircle, PlayCircle, Send } from "lucide-react";
import { adminAiControl, adminAlerts, adminAlertsTelegram, adminAlertsTelegramOff, adminAlertsTest, adminSaveAlerts, adminSetAiControl, type AiControl, type AlertKind, type AlertsView } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "ai" | "alerts" | "telegram" | "log";

/** Ümumi AI açarı: bütün müştərilər üçün AI sorğularını bir kliklə dayandırır. Dayandırma səbəblə, modal pəncərədə təsdiqlənir. */
function AiControlCard() {
  const { t, date } = useI18n();
  const [c, setC] = useState<AiControl | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminAiControl().then(setC).catch(() => setC({ paused: false })); }, []);
  const set = async (paused: boolean) => {
    setBusy(true);
    try { setC(await adminSetAiControl(paused, reason.trim())); setConfirm(false); setReason(""); toast.success(paused ? t("AI dayandırıldı.") : t("AI yenidən işləyir.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card className={c?.paused ? "border-destructive/50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{c?.paused ? <PauseCircle size={17} className="text-destructive" aria-hidden /> : <PlayCircle size={17} className="text-emerald-600" aria-hidden />}{t("AI açarı")}</CardTitle>
        <CardDescription>{t("Fövqəladə hal üçün: provayder çöküb, xərc qəfil artıb və ya səhv model yayımlanıb. Bütün müştərilərin vidjeti, kanalları və API sorğuları AI-sız qalır: vidjet əlaqə formasını göstərir.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!c ? <Skeleton className="h-10" /> : c.paused ? (
          <>
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <strong className="text-destructive">{t("AI dayandırılıb")}</strong>{c.at && ` · ${date(c.at)}`}{c.by && ` · ${c.by}`}
              {c.reason && <span className="mt-1 block">{t("Səbəb:")} {c.reason}</span>}
            </p>
            <div><Button disabled={busy} onClick={() => set(false)}><PlayCircle size={15} aria-hidden />{t("AI-ı yenidən aç")}</Button></div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
            <span className="flex items-center gap-2"><CircleCheck size={16} className="text-emerald-600" aria-hidden />{t("AI normal işləyir.")}</span>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setConfirm(true)}><PauseCircle size={15} aria-hidden />{t("Bütün AI sorğularını dayandır")}</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("Müştəri başına gündəlik xərc limiti “İstifadəçilər” → “Balansı idarə et” bölməsindədir. Hamı üçün ümumi limit: BILLING_DAILY_LIMIT_AZN (AI servisi).")}</p>
      </CardContent>
      <Modal open={confirm} onClose={() => setConfirm(false)} busy={busy} title={t("Bütün AI sorğularını dayandır")} description={t("Bütün müştərilərin vidjeti, kanalları və API sorğuları AI-sız qalacaq, adminlərə xəbər gedəcək.")}
        footer={<><Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="ai-pause" variant="destructive" disabled={busy || reason.trim().length < 3}>{t("Dayandır")}</Button></>}>
        <form id="ai-pause" className="flex flex-col gap-1" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 3) void set(true); }}>
          <Label htmlFor="ai-reason">{t("Səbəb (adminlərə xəbər gedəcək)")}</Label>
          <Input id="ai-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("məs. Anthropic API cavab vermir")} />
        </form>
      </Modal>
    </Card>
  );
}

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0"><span className="block text-sm font-medium">{title}</span>{note && <span className="block text-xs text-muted-foreground">{note}</span>}</span>
      <span className="flex shrink-0 items-center gap-2">{children}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t, date } = useI18n();
  const [tab, setTab] = useState<Tab>("ai");
  const [v, setV] = useState<AlertsView | null>(null);
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const load = () => adminAlerts().then((r) => { setV(r); setThreshold(String(r.settings.errorThreshold)); }).catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const save = async (patch: Parameters<typeof adminSaveAlerts>[0]) => {
    try { const r = await adminSaveAlerts(patch); setV(r); setThreshold(String(r.settings.errorThreshold)); toast.success(t("Ayarlar yadda saxlandı.")); } catch (e) { toast.error((e as Error).message); }
  };
  const test = async () => {
    setTesting(true);
    try { const r = await adminAlertsTest(); toast.success(t("Göndərildi: Telegram {tg}, e-poçt {em}.", { tg: r.telegram, em: r.email })); void load(); }
    catch (e) { toast.error((e as Error).message); } finally { setTesting(false); }
  };

  const kinds: Record<AlertKind, [string, string]> = {
    errors: [t("Xəta artımı"), t("15 dəqiqədə xəta sayı həddi keçəndə (saatda ən çox bir dəfə).")],
    health: [t("Servis əlçatmazdır"), t("AI servisi və ya baza ardıcıl 2 yoxlamada cavab verməyəndə və bərpa olanda.")],
    topup: [t("Yeni yükləmə sorğusu"), t("Müştəri balans yükləmək istəyəndə.")],
    channel: [t("Kanal qırıldı"), t("Müştərinin WhatsApp bağlantısı düşəndə (müştəri üzrə 6 saatda bir).")],
    limit: [t("Gündəlik limit"), t("Müştəri gündəlik xərc limitinə çatanda: qəfil artım ola bilər.")],
    domain: [t("Eyni domen yeni hesabda"), t("Artıq başqa e-poçtla işlənmiş sayt yeni hesabla qoşulanda: pulsuz balans sui-istifadəsi ola bilər.")],
    setup: [t("Yeni qurulum sorğusu"), t("Müştəri “Qurulumu bizə həvalə et” formasını göndərəndə.")],
    provider: [t("Claude / Gemini hesabı"), t("Claude və ya Gemini hesabında balans və ya limit bitəndə, API açarı qəbul olunmayanda; düzələndə də xəbər gəlir.")],
  };
  const th = Number(threshold);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Ümumi ayarlar")} description={t("Xəbərdarlıqlar və AI-ın ümumi idarəsi.")}
        actions={<Button variant="outline" disabled={testing || !v} onClick={test}><BellRing size={16} aria-hidden />{t("Mənə sınaq bildirişi göndər")}</Button>} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <FilterPills value={tab} onChange={setTab} label={t("Ümumi ayarlar")} items={[
        { value: "ai", label: t("AI açarı") },
        { value: "alerts", label: t("Xəbərdarlıqlar") },
        { value: "telegram", label: t("Mənim Telegram-ım") },
        { value: "log", label: t("Son xəbərdarlıqlar"), count: v?.log.length },
      ]} />

      {tab === "ai" && <AiControlCard />}

      {tab !== "ai" && !v && !error && <Skeleton className="h-64" />}

      {tab === "alerts" && v && (
        <>
          <Card>
            <CardHeader><CardTitle>{t("Hara göndərilsin")}</CardTitle><CardDescription>{t("Problem olanda bütün adminlərə xəbər gedir. Telegram ən sürətlisidir, e-poçt ehtiyat yoldur.")}</CardDescription></CardHeader>
            <CardContent className="divide-y divide-border">
              <Row title="Telegram" note={v.telegram.available ? t("@{bot} botu vasitəsilə", { bot: v.telegram.bot ?? "" }) : t("Serverdə NOTIFY_TELEGRAM_TOKEN yoxdur")}>
                {v.telegram.available ? <Switch checked={v.settings.telegram} onChange={(x) => save({ telegram: x })} label="Telegram" /> : <span className="text-xs text-muted-foreground">{t("əlçatan deyil")}</span>}
              </Row>
              <Row title={t("E-poçt")} note={v.mailConfigured ? t("Telegram bağlı olmayan adminlərə də gedir") : t("RESEND_API_KEY yoxdur: məktub göndərilmir")}>
                <Switch checked={v.settings.email} onChange={(x) => save({ email: x })} label={t("E-poçt")} />
              </Row>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("Nə vaxt xəbər verilsin")}</CardTitle><CardDescription>{t("Hər ikisi söndürülsə də, Telegram-ı bağlı admin yoxdursa məktub yenə göndərilir: xəbər itməsin.")}</CardDescription></CardHeader>
            <CardContent className="divide-y divide-border">
              {v.kinds.map((k) => (
                <Row key={k} title={kinds[k][0]} note={kinds[k][1]}><Switch checked={v.settings.kinds[k]} onChange={(x) => save({ kinds: { [k]: x } })} label={kinds[k][0]} /></Row>
              ))}
              <form className="flex flex-wrap items-end justify-between gap-3 pt-3" onSubmit={(e) => { e.preventDefault(); if (th >= 1) void save({ errorThreshold: th }); }}>
                <div className="flex flex-col gap-1"><Label htmlFor="al-th">{t("Xəta həddi (15 dəqiqədə)")}</Label><Input id="al-th" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ""))} className="w-28" /></div>
                <Button variant="outline" disabled={!threshold || th < 1 || th === v.settings.errorThreshold}>{t("Saxla")}</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "telegram" && v && (
        <Card>
          <CardHeader><CardTitle>{t("Mənim Telegram-ım")}</CardTitle><CardDescription>{t("Xəbərdarlıqları telefonda almaq üçün Telegram-ı hesabına bağla. Hər admin özü bağlayır.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {v.telegram.me ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex items-center gap-1.5"><CircleCheck size={16} className="text-emerald-600" aria-hidden />{t("Bağlıdır: {name}", { name: v.telegram.me.name || "Telegram" })}</span>
                <Button size="sm" variant="outline" onClick={async () => { try { setV(await adminAlertsTelegramOff()); } catch (e) { toast.error((e as Error).message); } }}>{t("Ayır")}</Button>
              </div>
            ) : link ? (
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                <p>{t("Linki aç və botda “Start” bas (10 dəqiqə etibarlıdır):")}</p>
                <a href={link} target="_blank" rel="noreferrer" className="break-all font-medium underline underline-offset-2">{link.replace("https://", "")}</a>
                <div><Button size="sm" variant="outline" onClick={() => { setLink(null); void load(); }}>{t("Bağladım, yoxla")}</Button></div>
              </div>
            ) : (
              <div><Button disabled={!v.telegram.available} onClick={async () => { try { setLink((await adminAlertsTelegram()).url); } catch (e) { toast.error((e as Error).message); } }}><Send size={15} aria-hidden />{t("Telegram-ı bağla")}</Button></div>
            )}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Alıcılar")}</p>
              <ul className="flex flex-wrap gap-2">{v.recipients.map((r) => <li key={r.email} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">{r.email}{r.telegram && <Send size={11} aria-label="Telegram" />}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "log" && v && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["ai", "db"] as const).map((k) => (
              <div key={k} className={cn("flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm", v.health[k].down ? "border-destructive/40 text-destructive" : "border-border")}>
                {v.health[k].down ? <CircleX size={18} aria-hidden /> : <CircleCheck size={18} className="text-emerald-600" aria-hidden />}
                <span className="font-medium">{k === "ai" ? t("AI servisi") : t("Verilənlər bazası")}</span>
                <span className="ml-auto text-muted-foreground">{v.health[k].down ? t("əlçatmazdır") : t("işləyir")}</span>
              </div>
            ))}
          </div>
          {v.log.length === 0 ? <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{t("Hələ xəbərdarlıq göndərilməyib.")}</p> : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">{t("Vaxt")}</th><th className="px-4 py-3 font-medium">{t("Xəbərdarlıq")}</th><th className="px-4 py-3 font-medium">Telegram</th><th className="px-4 py-3 font-medium">{t("E-poçt")}</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {v.log.map((l, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">{date(l.at)}</td>
                      <td className="px-4 py-3 font-medium">{l.title}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{l.telegram}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{l.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("Server yenidən başlayanda bu siyahı sıfırlanır.")}</p>
        </>
      )}
    </div>
  );
}
