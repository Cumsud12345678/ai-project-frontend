"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { connectWhatsApp, disconnectWhatsApp, getWhatsApp, patchWhatsApp, type WhatsAppStatus } from "@/lib/api";
import { FormSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

const warn = "flex gap-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm";

export function WhatsApp() {
  const { t, date } = useI18n();
  const [st, setSt] = useState<WhatsAppStatus | null>(null);
  const [error, setError] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const alive = useRef(true);
  // Strict Mode (dev) effekti ikiqat işlədir: təmizləmədən sonra yenidən true olmalıdır, yoxsa cavab heç vaxt yazılmır
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(() => getWhatsApp().then((s) => { if (alive.current) setSt(s); }).catch((e: Error) => { if (alive.current) setError(e.message); }), []);
  useEffect(() => { void refresh(); }, [refresh]);
  // QR gözlənilərkən və ya qoşulma bərpa olunarkən vəziyyət izlənir
  const watching = st ? st.state === "connecting" || st.state === "qr" : false;
  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => { void refresh(); }, 2500);
    return () => clearInterval(id);
  }, [watching, refresh]);

  async function connect() {
    setBusy(true); setError("");
    try { setSt(await connectWhatsApp()); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function patch(p: { enabled?: boolean; pauseOnOwnReply?: boolean }) {
    try { setSt(await patchWhatsApp(p)); } catch (err) { toast.error((err as Error).message); }
  }
  async function disconnect() {
    setBusy(true);
    try { await disconnectWhatsApp(); setSt(await getWhatsApp()); setConfirm(false); setAck(false); toast.success(t("WhatsApp nömrəsi ayrıldı.")); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  if (!st && !error) return <FormSkeleton />;
  const pending = st && !st.connected && (st.state === "connecting" || st.state === "qr");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#25D366]/15 text-[#128C7E]"><MessageCircle size={20} aria-hidden /></span>
          <div><CardTitle>WhatsApp</CardTitle><CardDescription>{t("Nömrəni QR kodla qoş: müştərilər WhatsApp-da yazanda köməkçi cavab versin.")}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {st && !st.keyReady && <p role="alert" className={warn}><TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />{t("Serverdə CHANNEL_SECRET_KEY təyin edilməyib. Bunu admin .env faylına əlavə etməlidir, yoxsa bot qoşmaq olmur.")}</p>}

        {st?.connected ? (
          <>
            <p className="text-sm">{t("Qoşulmuş nömrə")}: <strong dir="ltr">+{st.phone}</strong>{st.connectedAt && <span className="text-muted-foreground"> · {date(st.connectedAt)}</span>}</p>
            {st.state !== "open" && (
              <p role="status" className={warn}>
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />
                {st.error ? t(st.error) : st.state === "connecting" ? t("WhatsApp ilə bağlantı bərpa olunur…") : t("Bağlantı hazırda yoxdur. Bir azdan yenidən yoxla.")}
              </p>
            )}
            <SwitchRow checked={st.enabled} onChange={(v) => patch({ enabled: v })} title={t("Köməkçi cavab versin")} description={t("Söndürəndə köməkçi mesajlara cavab vermir, amma nömrə qoşulu qalır.")} on={t("Aktivdir")} off={t("Söndürülüb")} />
            <SwitchRow checked={st.pauseOnOwnReply} onChange={(v) => patch({ pauseOnOwnReply: v })} title={t("Mən yazanda köməkçi sussun")} description={t("Telefondan müştəriyə özün cavab yazsan, köməkçi həmin söhbətdə 12 saat cavab verməz.")} on={t("Aktivdir")} off={t("Söndürülüb")} />
            {confirm ? (
              <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3">
                <p className="text-sm">{t("Nömrə telefondakı “Əlaqəli cihazlar”dan çıxarılacaq və köməkçinin söhbət yaddaşı silinəcək. Telefonundakı WhatsApp mesajlarına toxunulmayacaq. Yenidən qoşmaq üçün QR lazım olacaq.")}</p>
                <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={busy} onClick={disconnect}>{t("Bəli, ayır")}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm(false)}>{t("Ləğv et")}</Button></div>
              </div>
            ) : <div><Button size="sm" variant="outline" onClick={() => setConfirm(true)}>{t("Nömrəni ayır")}</Button></div>}
          </>
        ) : pending ? (
          <div className="flex flex-col items-start gap-4">
            {st.qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={st.qr} alt={t("WhatsApp qoşulması üçün QR kod")} style={{ imageRendering: "pixelated" }} className="max-w-full rounded-lg border border-border bg-white" />
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                  <li>{t("Telefonda WhatsApp-ı aç: Ayarlar → Əlaqəli cihazlar.")}</li>
                  <li>{t("“Cihaz qoş” düyməsinə bas və bu kodu WhatsApp-ın öz skanerində oxut (telefonun kamerası ilə yox).")}</li>
                  <li>{t("Kod bir neçə saniyədən bir yenilənir: skan etdikdən sonra bu səhifəni bağlama.")}</li>
                </ol>
              </>
            ) : <p role="status" className="text-sm text-muted-foreground">{t("QR kod hazırlanır…")}</p>}
            <Button size="sm" variant="outline" disabled={busy} onClick={disconnect}>{t("Ləğv et")}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {st && (st.state === "error" || st.state === "replaced") && st.error && <p role="alert" className="text-sm text-destructive">{t(st.error)}</p>}
            <div className={warn}>
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber" aria-hidden />
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">{t("Bu, WhatsApp-ın rəsmi API-si deyil")}</p>
                <p>{t("QR ilə qoşulma qeyri-rəsmi üsuldur: WhatsApp bunu qaydalarına zidd saya və nömrəni müvəqqəti və ya həmişəlik blok edə bilər. Bu riski sən daşıyırsan. Əsas şəxsi nömrəni deyil, ayrıca bu iş üçün nömrəni qoş.")}</p>
              </div>
            </div>
            <label className="flex max-w-xl items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={busy} />
              <span>{t("Riski başa düşürəm və nömrənin bloklana biləcəyi ilə razıyam.")}</span>
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div><Button disabled={busy || !ack || !st?.keyReady} onClick={connect}>{busy ? t("Qoşulur…") : t("QR kodu göstər")}</Button></div>
          </div>
        )}
        {st?.connected && error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">{t("Bilməli olduqların")}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("Köməkçi yalnız şəxsi yazışmalarda cavab verir: qrup, status və kanallara yox.")}</li>
            <li>{t("Qoşulan nömrəyə yazan hər kəsə cavab veriləcək. Ona görə ayrıca iş nömrəsi məsləhətdir.")}</li>
            <li>{t("Hələlik yalnız yazılı mesajlara cavab verir: səs və şəkil dəstəklənmir.")}</li>
            <li>{t("Cavablar bloklanma riskini azaltmaq üçün bir az gecikmə ilə, saatda ən çox 150 cavab həddi ilə göndərilir.")}</li>
            <li>{t("Cavab tapılmayanda köməkçi telefon və ya e-poçt istəyir, müraciət “Müraciətlər” bölməsinə düşür və sənə e-poçt gəlir.")}</li>
            <li>{t("Telefon hər gün internetdə olmalı deyil, amma 14 gündən çox oflayn qalsa və ya nömrəni “Əlaqəli cihazlar”dan çıxarsan, bağlantı kəsilir.")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
