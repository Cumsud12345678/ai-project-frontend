"use client";
// Randevular: AI çatda boş vaxtı yoxlayıb müştərini yazır. Burada sahib randevuları görür (gün-gün), gəldi/gəlmədi qeyd edir,
// ləğv edir (Telegram/WhatsApp müştərisinə mesaj gedir) və ayarları (xidmətlər, iş saatları, tutum) dəyişir.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarX2, Check, Plus, Settings2, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { deleteBooking, getBooking, getBookings, saveBooking, setBookingStatus, type BookingDay, type BookingItem, type BookingService, type BookingSettings, type BookingStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader, FilterPills } from "@/components/page-header";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { SwitchRow } from "@/components/ui/switch";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // bazar ertəsindən başlayır (massivdə 0 = bazar)
const STEPS = [10, 15, 20, 30, 45, 60];
const DEFAULT: BookingSettings = {
  enabled: true, services: [{ name: "", duration: 60 }], days: [null, ...Array(5).fill({ from: "10:00", to: "19:00" }), { from: "10:00", to: "16:00" }],
  step: 30, capacity: 1, noticeMin: 60, horizonDays: 30, closedDates: [], reminders: true,
};
const CHANNEL: Record<string, string> = { widget: "Sayt", telegram: "Telegram", whatsapp: "WhatsApp", api: "API" };

function SettingsModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: BookingSettings | null; onSaved: (b: BookingSettings | null) => void }) {
  const { t } = useI18n();
  const WEEK = [t("Bazar"), t("Bazar ertəsi"), t("Çərşənbə axşamı"), t("Çərşənbə"), t("Cümə axşamı"), t("Cümə"), t("Şənbə")];
  const [b, setB] = useState<BookingSettings>(initial ?? DEFAULT);
  const [closed, setClosed] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { if (open) { const x = initial ?? DEFAULT; setB({ ...x, days: x.days.map((d) => (d ? { ...d } : null)), services: x.services.map((s) => ({ ...s })) }); setClosed((x.closedDates ?? []).join(", ")); } }, [open, initial]);
  const setSvc = (i: number, p: Partial<BookingService>) => setB((x) => ({ ...x, services: x.services.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const setDay = (i: number, d: BookingDay) => setB((x) => ({ ...x, days: x.days.map((v, j) => (j === i ? d : v)) }));

  async function save() {
    const closedDates = closed.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
    if (closedDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) { toast.error(t("Bağlı günləri YYYY-AA-GG formatında yaz, məs. 2026-12-31")); return; }
    setBusy(true);
    try {
      const r = await saveBooking({ ...b, services: b.services.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), duration: Number(s.duration), ...(s.price?.trim() && { price: s.price.trim() }) })), closedDates,
        ...(b.title?.trim() ? { title: b.title.trim() } : { title: undefined }), ...(b.instructions?.trim() ? { instructions: b.instructions.trim() } : { instructions: undefined }) });
      onSaved(r.booking); onClose(); toast.success(t("Saxlandı."));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} busy={busy} size="lg" title={t("Randevu ayarları")}
        description={t("AI yalnız bu iş saatlarında və boş vaxtlarda randevu yazır. Eyni anda neçə müştəri qəbul etdiyini (usta, kabinet sayı) yaz.")}
        footer={<>
          {initial && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setConfirmDel(true)} disabled={busy}><Trash2 size={14} aria-hidden />{t("Söndür və sil")}</Button>}
          <Button variant="outline" onClick={onClose} disabled={busy}>{t("Ləğv et")}</Button>
          <Button onClick={save} disabled={busy || !b.services.some((s) => s.name.trim())}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        </>}>
        <div className="flex flex-col gap-5 text-sm">
          <SwitchRow checked={b.enabled} onChange={(v) => setB((x) => ({ ...x, enabled: v }))} title={t("Çatda randevu qəbul et")} description={t("Sayt vidjeti, Telegram və WhatsApp-da işləyir.")} on={t("Aktiv")} off={t("Söndürülüb")} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="bk-title">{t("Ad")}</Label>
            <Input id="bk-title" value={b.title ?? ""} maxLength={60} onChange={(e) => setB((x) => ({ ...x, title: e.target.value }))} placeholder={t("məs. Salona yazılış, Həkim qəbulu")} />
          </div>
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{t("Xidmətlər")}</h3>
              <Button size="sm" variant="outline" disabled={b.services.length >= 30} onClick={() => setB((x) => ({ ...x, services: [...x.services, { name: "", duration: 30 }] }))}><Plus size={14} aria-hidden />{t("Xidmət əlavə et")}</Button></div>
            {b.services.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_6.5rem_6.5rem_auto] items-center gap-2">
                <Input aria-label={t("Xidmətin adı")} value={s.name} maxLength={60} onChange={(e) => setSvc(i, { name: e.target.value })} placeholder={t("məs. Saç kəsimi")} />
                <div className="relative"><Input aria-label={t("Müddət (dəq)")} type="number" min={5} max={480} value={s.duration} onChange={(e) => setSvc(i, { duration: Number(e.target.value) })} className="pr-10" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("dəq")}</span></div>
                <Input aria-label={t("Qiymət")} value={s.price ?? ""} maxLength={30} onChange={(e) => setSvc(i, { price: e.target.value })} placeholder={t("Qiymət")} />
                <Button size="sm" variant="ghost" aria-label={t("Sil")} disabled={b.services.length === 1} onClick={() => setB((x) => ({ ...x, services: x.services.filter((_, j) => j !== i) }))}><Trash2 size={14} aria-hidden /></Button>
              </div>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("İş saatları")}</h3>
            {ORDER.map((i) => { const d = b.days[i]; return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <label className="flex w-40 items-center gap-2"><input type="checkbox" checked={Boolean(d)} onChange={(e) => setDay(i, e.target.checked ? { from: "10:00", to: "19:00" } : null)} />{WEEK[i]}</label>
                {d ? <>
                  <Input type="time" aria-label={`${WEEK[i]}: ${t("başlanğıc")}`} value={d.from} onChange={(e) => setDay(i, { ...d, from: e.target.value })} className="w-32" />
                  <span className="text-muted-foreground">—</span>
                  <Input type="time" aria-label={`${WEEK[i]}: ${t("son")}`} value={d.to} onChange={(e) => setDay(i, { ...d, to: e.target.value })} className="w-32" />
                </> : <span className="text-muted-foreground">{t("Bağlı")}</span>}
              </div>
            ); })}
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1"><Label htmlFor="bk-step">{t("Vaxt addımı")}</Label>
              <select id="bk-step" value={b.step} onChange={(e) => setB((x) => ({ ...x, step: Number(e.target.value) }))} className="h-10 rounded-md border border-border bg-card px-2">{STEPS.map((s) => <option key={s} value={s}>{t("{n} dəqiqə", { n: s })}</option>)}</select></div>
            <div className="flex flex-col gap-1"><Label htmlFor="bk-cap">{t("Eyni anda neçə müştəri")}</Label>
              <Input id="bk-cap" type="number" min={1} max={20} value={b.capacity} onChange={(e) => setB((x) => ({ ...x, capacity: Number(e.target.value) }))} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="bk-notice">{t("Ən az neçə dəqiqə qabaqcadan")}</Label>
              <Input id="bk-notice" type="number" min={0} max={2880} value={b.noticeMin} onChange={(e) => setB((x) => ({ ...x, noticeMin: Number(e.target.value) }))} /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="bk-hz">{t("Neçə gün irəliyə yazmaq olar")}</Label>
              <Input id="bk-hz" type="number" min={1} max={90} value={b.horizonDays} onChange={(e) => setB((x) => ({ ...x, horizonDays: Number(e.target.value) }))} /></div>
          </section>
          <div className="flex flex-col gap-1"><Label htmlFor="bk-closed">{t("Bağlı günlər (bayram, məzuniyyət)")}</Label>
            <Input id="bk-closed" value={closed} onChange={(e) => setClosed(e.target.value)} placeholder="2026-12-31, 2027-01-01" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="bk-rules">{t("Qaydalar")}</Label>
            <Textarea id="bk-rules" rows={3} maxLength={1000} value={b.instructions ?? ""} onChange={(e) => setB((x) => ({ ...x, instructions: e.target.value }))} placeholder={t("məs. 10 dəqiqədən çox gecikən müştərinin randevusu ləğv olunur. Ödəniş yerində, nağd və ya kartla.")} /></div>
          <SwitchRow checked={b.reminders} onChange={(v) => setB((x) => ({ ...x, reminders: v }))} title={t("Müştəriyə xatırlatma göndər")} description={t("Telegram və WhatsApp-dan yazılanlara bir gün əvvəl (yaxın randevuda 2 saat əvvəl) avtomatik mesaj.")} on={t("Aktiv")} off={t("Söndürülüb")} />
        </div>
      </Modal>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} busy={busy} size="sm" title={t("Randevu qəbulu söndürülsün?")}
        footer={<><Button variant="outline" onClick={() => setConfirmDel(false)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await deleteBooking(); onSaved(null); setConfirmDel(false); onClose(); toast.success(t("Silindi.")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
        }}>{t("Sil")}</Button></>}>
        <p className="text-sm text-muted-foreground">{t("AI çatda randevu yazmağı dayandıracaq. Artıq yazılmış randevular siyahıda qalır.")}</p>
      </Modal>
    </>
  );
}

function Bookings() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<BookingSettings | null | undefined>(undefined);
  const [items, setItems] = useState<BookingItem[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [settings, setSettings] = useState(false);
  const [cancel, setCancel] = useState<BookingItem | null>(null);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => getBookings().then((r) => setItems(r.items)).catch((e) => toast.error((e as Error).message)), []);
  useEffect(() => { getBooking().then((r) => setCfg(r.booking)).catch(() => setCfg(null)); void load(); }, [load]);

  const statusLabel: Record<BookingStatus, [string, BadgeTone]> = { booked: [t("Gözlənilir"), "info"], done: [t("Gəldi"), "success"], noshow: [t("Gəlmədi"), "warning"], cancelled: [t("Ləğv olundu"), "neutral"] };
  const now = Date.now();
  const groups = useMemo(() => {
    const list = items.filter((x) => (filter === "cancelled" ? x.booking.status === "cancelled" : x.booking.status !== "cancelled" && (filter === "upcoming" ? Date.parse(x.booking.end) >= now : Date.parse(x.booking.end) < now)));
    if (filter !== "upcoming") list.reverse();
    const by = new Map<string, BookingItem[]>();
    for (const x of list) by.set(x.booking.date, [...(by.get(x.booking.date) ?? []), x]);
    return [...by.entries()];
  }, [items, filter, now]);
  const counts = { upcoming: items.filter((x) => x.booking.status !== "cancelled" && Date.parse(x.booking.end) >= now).length, past: items.filter((x) => x.booking.status !== "cancelled" && Date.parse(x.booking.end) < now).length, cancelled: items.filter((x) => x.booking.status === "cancelled").length };
  // Brauzerlərin bəzisində az dili üçün tarix adları yoxdur: gün adı tərcümədən, tarix rəqəmlə
  const WEEK = [t("Bazar"), t("Bazar ertəsi"), t("Çərşənbə axşamı"), t("Çərşənbə"), t("Cümə axşamı"), t("Cümə"), t("Şənbə")];
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const dayTitle = (d: string) => `${d === today ? `${t("Bu gün")} · ` : d === tomorrow ? `${t("Sabah")} · ` : ""}${WEEK[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

  async function setStatus(x: BookingItem, status: BookingStatus, extra: { notify?: boolean; note?: string } = {}) {
    setBusy(true);
    try {
      const r = await setBookingStatus(x.id, { status, ...extra });
      setItems((xs) => xs.map((y) => (y.id === x.id ? { ...y, booking: { ...y.booking, ...r.lead.booking } } : y)));
      if (r.notifyError) toast.error(t("Status dəyişdi, amma müştəriyə mesaj getmədi: {e}", { e: r.notifyError }));
      else toast.success(r.notified ? t("Ləğv olundu, müştəriyə mesaj göndərildi.") : t("Saxlandı."));
      setCancel(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (cfg === undefined) return <FormSkeleton />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Randevular")}
        description={t("AI çatda boş vaxtı yoxlayır, müştərini yazır və sizə xəbər verir. Telegram və WhatsApp müştərisinə randevudan əvvəl xatırlatma gedir.")}
        actions={<Button variant={cfg ? "outline" : "default"} onClick={() => setSettings(true)}>{cfg ? <><Settings2 size={14} aria-hidden />{t("Ayarlar")}</> : <><Plus size={14} aria-hidden />{t("Randevu qəbulunu qur")}</>}</Button>} />

      {!cfg ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <CalendarClock size={28} className="text-muted-foreground" aria-hidden />
          <p className="font-medium">{t("Randevu qəbulu hələ qurulmayıb")}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t("Xidmətləri və iş saatlarını yaz: AI müştəriyə yalnız boş vaxtları təklif edəcək və təsdiq alandan sonra yazacaq. Salon, klinika, kurs və xidmət biznesləri üçün.")}</p>
        </div>
      ) : (
        <>
          {!cfg.enabled && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("Randevu qəbulu söndürülüb: AI yeni randevu yazmır.")}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterPills value={filter} onChange={setFilter} label={t("Randevular")} items={[{ value: "upcoming", label: t("Qarşıdakı"), count: counts.upcoming }, { value: "past", label: t("Keçmiş"), count: counts.past }, { value: "cancelled", label: t("Ləğv olunan"), count: counts.cancelled }]} />
            <Link href="/playground" className="text-sm underline">{t("Sınaq söhbətində yoxla")}</Link>
          </div>
          {!groups.length && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("Bu bölmədə randevu yoxdur.")}</p>}
          {groups.map(([date, list]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{dayTitle(date)}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {list.map((x) => { const [sl, tone] = statusLabel[x.booking.status]; return (
                  <li key={x.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-14 shrink-0 font-semibold tabular-nums">{x.booking.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{x.name || x.contact} <span className="font-normal text-muted-foreground">· {x.booking.service}{x.booking.price ? ` · ${x.booking.price}` : ""}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{x.contact}{x.booking.channel ? ` · ${t(CHANNEL[x.booking.channel] ?? x.booking.channel)}` : ""}{x.booking.note ? ` · ${x.booking.note}` : ""}</p>
                    </div>
                    <Badge tone={tone}>{sl}</Badge>
                    <RowMenu items={[
                      { label: t("Gəldi"), icon: Check, run: () => setStatus(x, "done"), disabled: busy || x.booking.status === "done" },
                      { label: t("Gəlmədi"), icon: UserX, run: () => setStatus(x, "noshow"), disabled: busy || x.booking.status === "noshow" },
                      ...(x.booking.status !== "booked" ? [{ label: t("Gözlənilir et"), icon: CalendarClock, run: () => setStatus(x, "booked"), disabled: busy }] : []),
                      { label: t("Ləğv et"), icon: CalendarX2, danger: true, run: () => { setCancel(x); setNotify(Boolean(x.booking.notify)); setNote(""); }, disabled: busy || x.booking.status === "cancelled" },
                    ]} />
                  </li>
                ); })}
              </ul>
            </section>
          ))}
        </>
      )}

      <SettingsModal open={settings} onClose={() => setSettings(false)} initial={cfg ?? null} onSaved={setCfg} />
      <Modal open={Boolean(cancel)} onClose={() => setCancel(null)} busy={busy} size="sm" title={t("Randevu ləğv olunsun?")}
        footer={<><Button variant="outline" onClick={() => setCancel(null)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={() => cancel && setStatus(cancel, "cancelled", { notify: notify && Boolean(cancel.booking.notify), ...(note.trim() && { note: note.trim() }) })}>{t("Randevunu ləğv et")}</Button></>}>
        {cancel && (
          <div className="flex flex-col gap-3 text-sm">
            <p>{cancel.name || cancel.contact} · {cancel.booking.service} · {cancel.booking.date} {cancel.booking.time}</p>
            {cancel.booking.notify ? (
              <>
                <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={notify} onChange={(e) => setNotify(e.target.checked)} />{t("Müştəriyə {ch}-da xəbər ver", { ch: (CHANNEL[cancel.booking.channel ?? ""] ? t(CHANNEL[cancel.booking.channel ?? ""]!) : t("çat")) })}</label>
                {notify && <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("Səbəb və ya yeni vaxt təklifi (istəyə bağlı)")} aria-label={t("Əlavə qeyd")} />}
              </>
            ) : <p className="text-xs text-muted-foreground">{t("Bu müştəriyə avtomatik mesaj göndərmək olmur (saytdan yazılıb). Özün zəng et: {c}", { c: cancel.contact })}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function BookingsPage() {
  return <RequireTenant><Bookings /></RequireTenant>;
}
