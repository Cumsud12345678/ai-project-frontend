"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { saveWidget, type WidgetResponse, type WorkHours } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

const DEFAULT_HOURS: WorkHours = { tz: "Asia/Baku", days: [null, ...Array.from({ length: 5 }, () => ({ from: "09:00", to: "18:00" })), null] };

/**
 * Canlı operator (açıq/bağlı, işçi saatları, CSAT) və proaktiv mesajlar.
 * Canlı operatorun bütün ayarları yalnız bu kartdadır: əvvəl açıq/bağlı “Görünüş” kartında idi və iki kart
 * bir-birinin köhnə dəyərini yazırdı (saat qoyub saxlayanda operator bağlı qalırdı).
 */
export function HelpdeskCard({ data, onChange }: { data: WidgetResponse; onChange: (d: WidgetResponse) => void }) {
  const { t } = useI18n();
  const w = data.widget;
  const [liveOn, setLiveOn] = useState(Boolean(w.live?.enabled));
  const [csat, setCsat] = useState(w.live?.csat !== false);
  const [hours, setHours] = useState<WorkHours | null>(w.live?.hours ?? null);
  const [busy, setBusy] = useState(false);
  // Həftə Bazar ertəsindən başlayır, serverdə indeks 0 = Bazar
  const dayNames = [t("Bazar"), t("Bazar ertəsi"), t("Çərşənbə axşamı"), t("Çərşənbə"), t("Cümə axşamı"), t("Cümə"), t("Şənbə")];
  const order = [1, 2, 3, 4, 5, 6, 0];

  const dirty = liveOn !== Boolean(w.live?.enabled) || csat !== (w.live?.csat !== false) || JSON.stringify(hours) !== JSON.stringify(w.live?.hours ?? null);
  const setDay = (i: number, v: { from: string; to: string } | null) => hours && setHours({ ...hours, days: hours.days.map((d, j) => (j === i ? v : d)) });

  // Boş saat, səhv saat qurşağı və ya iş günü seçilməməsi saxlanmadan əvvəl tutulur
  const tzOk = (z: string) => { try { new Intl.DateTimeFormat("en", { timeZone: z }); return true; } catch { return false; } };
  const hoursErr = !hours ? "" : !hours.tz || !tzOk(hours.tz) ? t("Saat qurşağı düzgün deyil (məs. Asia/Baku).")
    : hours.days.every((d) => !d) ? t("Ən azı bir iş günü seç.")
    : hours.days.some((d) => d && (!d.from || !d.to)) ? t("Seçilmiş günlərdə başlanğıc və bitiş saatını yaz.")
    : hours.days.some((d) => d && d.from === d.to && d.from !== "00:00") ? t("Başlanğıc və bitiş eyni ola bilməz (bütün gün üçün 00:00–00:00).") : "";
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    if (hoursErr) { toast.error(hoursErr); return; }
    setBusy(true);
    try {
      onChange(await saveWidget({ live: { enabled: liveOn, csat, hours } }));
      toast.success(t("Saxlandı. Dəyişiklik saytda səhifə yenilənəndə görünəcək."));
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card id="live" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t("Canlı operator")}</CardTitle>
        <CardDescription>{t("Operatorla canlı söhbət, işçi saatları və söhbət sonrası qiymətləndirmə.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-5 text-sm">
          <SwitchRow checked={liveOn} onChange={setLiveOn} on={t("Açıq")} off={t("Bağlı")}
            title={t("Canlı operator söhbəti")} description={t("Ziyarətçi çatda “Operatorla canlı yaz” düyməsini görür, Telegram və WhatsApp müştəriləri isə /operator yazır; sən Müraciətlər bölməsindən real vaxtda cavab verirsən. Yalnız panelə baxa bildiyin vaxtlarda aç: operator cavab verməsə ziyarətçiyə əlaqə forması təklif olunur.")} />

          <div className="flex flex-col gap-3">
            {/* Saat qoymaq = operatorun işləməsini istəmək: bağlı idisə avtomatik açılır */}
            <SwitchRow checked={Boolean(hours)} onChange={(v) => { setHours(v ? (w.live?.hours ?? DEFAULT_HOURS) : null); if (v) setLiveOn(true); }} on={t("Saatla")} off={t("Həmişə")} title={t("Canlı operator işçi saatları")}
              description={t("İşçi saatlarından kənarda “Operatorla canlı yaz” düyməsi gizlənir, Telegram/WhatsApp-da /operator da işləmir və ziyarətçiyə əlaqə forması təklif olunur.")} />
            {hours && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="hd-tz">{t("Saat qurşağı")}</Label>
                  <Input id="hd-tz" value={hours.tz} maxLength={60} onChange={(e) => setHours({ ...hours, tz: e.target.value.trim() })} placeholder="Asia/Baku" className="max-w-xs" />
                </div>
                <ul className="flex flex-col gap-1.5">
                  {order.map((i) => {
                    const d = hours.days[i];
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-2">
                        <label className="flex w-44 items-center gap-2"><input type="checkbox" checked={Boolean(d)} onChange={(e) => setDay(i, e.target.checked ? { from: "09:00", to: "18:00" } : null)} />{dayNames[i]}</label>
                        {d ? (
                          <>
                            <Input type="time" value={d.from} onChange={(e) => setDay(i, { ...d, from: e.target.value })} aria-label={t("Başlanğıc")} className="w-32" />
                            <span aria-hidden>–</span>
                            <Input type="time" value={d.to} onChange={(e) => setDay(i, { ...d, to: e.target.value })} aria-label={t("Bitiş")} className="w-32" />
                          </>
                        ) : <span className="text-muted-foreground">{t("Qeyri-iş günü")}</span>}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground">{t("Gecə növbəsi üçün bitişi başlanğıcdan kiçik yaz (məs. 22:00–02:00, ertəsi gün bitir). 00:00–00:00 bütün gün deməkdir.")}</p>
              </div>
            )}
            {hoursErr && <p role="alert" className="text-xs text-destructive">{hoursErr}</p>}
            {!liveOn && hours && <p className="text-xs text-muted-foreground">{t("Canlı operator bağlıdır: işçi saatları yadda qalır, amma operator açılana qədər təsir etmir.")}</p>}
          </div>

          <SwitchRow checked={csat} onChange={setCsat} on={t("Aktiv")} off={t("Söndürülüb")} title={t("Söhbət sonrası qiymət (CSAT)")}
            description={t("Operator cavab verib söhbəti bitirəndən sonra ziyarətçidən 1-5 ulduz istənir. Nəticə Canlı söhbət bölməsində görünür.")} />

          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            {t("Proaktiv mesajlar indi Kampaniyalar bölməsindədir: başlıq, düymələr, kimə və nə vaxt göstərilməsi, statistika.")}{" "}
            <Link href="/customers?f=campaigns" className="font-medium text-foreground underline underline-offset-2">{t("Kampaniyalara keç")}</Link>
          </p>
          {liveOn && <p className="text-xs text-muted-foreground">{t("Operatorların hazır cavabları Ayarlar → Hazır cavablar bölməsindədir.")} <Link href="/settings/canned" className="font-medium text-foreground underline underline-offset-2">{t("Aç")}</Link></p>}
          <Button disabled={!dirty || busy} className="self-start">{t("Saxla")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
