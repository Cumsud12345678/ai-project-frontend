"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCanned, saveCanned, saveWidget, type CannedReply, type ProactiveRule, type WidgetResponse, type WorkHours } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

const DEFAULT_HOURS: WorkHours = { tz: "Asia/Baku", days: [null, ...Array.from({ length: 5 }, () => ({ from: "09:00", to: "18:00" })), null] };
type Rule = Omit<ProactiveRule, "id"> & { id?: string };

/** İşçi saatları, CSAT qiymətləndirməsi və proaktiv mesajlar: canlı operator və vidjet davranışı. */
export function HelpdeskCard({ data, onChange }: { data: WidgetResponse; onChange: (d: WidgetResponse) => void }) {
  const { t } = useI18n();
  const w = data.widget;
  const [csat, setCsat] = useState(w.live?.csat !== false);
  const [hours, setHours] = useState<WorkHours | null>(w.live?.hours ?? null);
  const [proOn, setProOn] = useState(Boolean(w.proactive?.enabled));
  const [rules, setRules] = useState<Rule[]>(w.proactive?.rules ?? []);
  const [busy, setBusy] = useState(false);
  // Həftə Bazar ertəsindən başlayır, serverdə indeks 0 = Bazar
  const dayNames = [t("Bazar"), t("Bazar ertəsi"), t("Çərşənbə axşamı"), t("Çərşənbə"), t("Cümə axşamı"), t("Cümə"), t("Şənbə")];
  const order = [1, 2, 3, 4, 5, 6, 0];

  const dirty = csat !== (w.live?.csat !== false) || JSON.stringify(hours) !== JSON.stringify(w.live?.hours ?? null) || proOn !== Boolean(w.proactive?.enabled) || JSON.stringify(rules) !== JSON.stringify(w.proactive?.rules ?? []);
  const setDay = (i: number, v: { from: string; to: string } | null) => hours && setHours({ ...hours, days: hours.days.map((d, j) => (j === i ? v : d)) });
  const setRule = (i: number, p: Partial<Rule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...p } : r)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    try {
      onChange(await saveWidget({ live: { enabled: Boolean(w.live?.enabled), csat, hours }, proactive: { enabled: proOn, rules: rules as ProactiveRule[] } }));
      toast.success(t("Saxlandı. Dəyişiklik saytda səhifə yenilənəndə görünəcək."));
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Operator və proaktiv mesajlar")}</CardTitle>
        <CardDescription>{t("İşçi saatları, söhbət sonrası qiymətləndirmə və ziyarətçi yazmamış çatın özü təklif göstərməsi.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-5 text-sm">
          <div className="flex flex-col gap-3">
            <SwitchRow checked={Boolean(hours)} onChange={(v) => setHours(v ? DEFAULT_HOURS : null)} on={t("Saatla")} off={t("Həmişə")} title={t("Canlı operator işçi saatları")}
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
              </div>
            )}
          </div>

          <SwitchRow checked={csat} onChange={setCsat} on={t("Aktiv")} off={t("Söndürülüb")} title={t("Söhbət sonrası qiymət (CSAT)")}
            description={t("Operator cavab verib söhbəti bitirəndən sonra ziyarətçidən 1-5 ulduz istənir. Nəticə Canlı söhbət bölməsində görünür.")} />

          <div className="flex flex-col gap-3">
            <SwitchRow checked={proOn} onChange={setProOn} on={t("Aktiv")} off={t("Söndürülüb")} title={t("Proaktiv mesajlar")}
              description={t("Ziyarətçi yazmamış, səhifədə müəyyən vaxt qalanda çat düyməsinin yanında qısa təklif çıxır. Mətn sənin yazdığındır, AI xərci yoxdur. Eyni ziyarətçiyə bir sessiyada hər mesaj yalnız bir dəfə göstərilir.")} />
            {proOn && (
              <div className="flex flex-col gap-3">
                {rules.map((r, i) => (
                  <div key={r.id ?? `n${i}`} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <Label htmlFor={`pr-t${i}`}>{t("Mesaj")}</Label>
                    <Textarea id={`pr-t${i}`} value={r.text} maxLength={140} rows={2} onChange={(e) => setRule(i, { text: e.target.value })} placeholder={t("Sualın var? Sənə kömək edə bilərəm.")} />
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`pr-d${i}`}>{t("Neçə saniyədən sonra")}</Label>
                        <Input id={`pr-d${i}`} type="number" min={3} max={300} value={r.delaySec} onChange={(e) => setRule(i, { delaySec: Math.round(Number(e.target.value)) })} className="w-28" />
                      </div>
                      <div className="flex min-w-48 flex-1 flex-col gap-1">
                        <Label htmlFor={`pr-m${i}`}>{t("Hansı səhifələrdə")}</Label>
                        <Input id={`pr-m${i}`} value={r.match} maxLength={200} onChange={(e) => setRule(i, { match: e.target.value })} placeholder="/, /products/*" />
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{t("Səhifə şablonu: * bütün sayt, /products/* bu bölmənin hamısı, vergüllə bir neçə yol. Ən çox 5 mesaj.")}</p>
                {rules.length < 5 && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setRules([...rules, { text: "", delaySec: 20, match: "*" }])}><Plus size={14} aria-hidden />{t("Mesaj əlavə et")}</Button>}
                <p className="text-xs text-muted-foreground">{t("Başqa şərt üçün (məsələn, səbət tərk edilib) saytın skriptindən çağır:")} <code className="font-mono">CarAdvisor.proactive("Səbətində məhsul qalıb, kömək edim?")</code></p>
              </div>
            )}
          </div>
          <Button disabled={!dirty || busy} className="self-start">{t("Saxla")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Operatorlar üçün hazır cavablar; yalnız sahib dəyişir. */
export function CannedCard() {
  const { t } = useI18n();
  const { isOperator } = useSession();
  const [items, setItems] = useState<(Omit<CannedReply, "id"> & { id?: string })[] | null>(null);
  const [orig, setOrig] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { getCanned().then((r) => { setItems(r.items); setOrig(JSON.stringify(r.items)); }).catch(() => setItems([])); }, []);
  if (isOperator || items === null) return null;
  const dirty = JSON.stringify(items) !== orig;
  const set = (i: number, p: Partial<CannedReply>) => setItems(items.map((r, j) => (j === i ? { ...r, ...p } : r)));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy || !items) return;
    setBusy(true);
    try { const r = await saveCanned(items); setItems(r.items); setOrig(JSON.stringify(r.items)); toast.success(t("Saxlandı.")); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Hazır cavablar")}</CardTitle>
        <CardDescription>{t("Operatorlar canlı söhbətdə bir kliklə seçib mətni redaktə edib göndərir. Ən çox 30.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-3 text-sm">
          {items.map((r, i) => (
            <div key={r.id ?? `n${i}`} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor={`cn-t${i}`}>{t("Ad")}</Label>
                  <Input id={`cn-t${i}`} value={r.title} maxLength={40} onChange={(e) => set(i, { title: e.target.value })} placeholder={t("Məsələn: Çatdırılma müddəti")} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
              </div>
              <Textarea value={r.text} maxLength={1000} rows={3} onChange={(e) => set(i, { text: e.target.value })} aria-label={t("Mətn")} />
            </div>
          ))}
          {!items.length && <p className="text-muted-foreground">{t("Hələ hazır cavab yoxdur.")}</p>}
          <div className="flex gap-2">
            {items.length < 30 && <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { title: "", text: "" }])}><Plus size={14} aria-hidden />{t("Cavab əlavə et")}</Button>}
            <Button disabled={!dirty || busy || items.some((x) => !x.title.trim() || !x.text.trim())} size="sm">{t("Saxla")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
