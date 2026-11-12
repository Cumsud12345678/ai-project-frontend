"use client";
// Sehirbazın "hazır başlanğıc" hissəsi: biznesin növünə görə hazır ayarlar.
// Məqsəd: yeni müştəri bir neçə sahəni doldurub dərhal işləyən botu sınaya bilsin.
//  - Əlaqə məlumatı → şirkət profili; məhsul/xidmət siyahısı və çatdırılma → bilik bazası (mətn)
//  - Xidmət biznesi → randevu təqvimi (xidmətlər siyahıdan, iş saatları formadan)
//  - Mağaza, sosial şəbəkə, yemək, kurs → sifariş/yazılış forması
//  - Sosial şəbəkə və yemək → susan müştəriyə xatırlatma
// Artıq qurulmuş forma və ya təqvim varsa üzərinə yazılmır.
// Yazılanlar növ üzrə qaralama kimi serverdə saxlanır (növü dəyişib qayıdanda itmir, sehirbaz bitəndə silinir).
// Yenidən "Köməkçini hazırla" basılanda əvvəlki dəfə yaradılanlar silinir, sonra yenidən yaradılır: köhnə seçim qarışmır.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, CalendarClock, CircleCheck, GraduationCap, Headset, Instagram, Loader2, MoreHorizontal, ShoppingBag, ShoppingCart, Sparkles, UtensilsCrossed, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAiMode, getBooking, getFollowup, getKb, getOrderForm, kbAddText, resetQuickstart, saveAiMode, saveBooking, saveFollowup, saveOrderForm, saveProfile, saveSetupDraft, saveSetupMade,
  type BizType, type BookingService, type CompanyInfo, type OrderForm,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type T = (k: string, v?: Record<string, string | number>) => string;

export function bizTypes(t: T): { id: BizType; icon: React.ElementType; title: string; text: string }[] {
  return [
    { id: "shop", icon: ShoppingCart, title: t("Onlayn mağaza"), text: t("Saytda məhsul satıram. Köməkçi məhsul və çatdırılma suallarına cavab verir, sifariş qəbul edir.") },
    { id: "social", icon: Instagram, title: t("Sosial şəbəkədə satış"), text: t("Instagram, WhatsApp və ya Telegram-da satıram. Köməkçi qiymət soruşana cavab verir, sifarişi toplayır.") },
    { id: "service", icon: CalendarClock, title: t("Xidmət və randevu"), text: t("Salon, klinika, usta, studiya. Köməkçi boş vaxtı təklif edir və müştərini yazır.") },
    { id: "food", icon: UtensilsCrossed, title: t("Restoran, kafe, çatdırılma"), text: t("Köməkçi menyu suallarına cavab verir və yemək sifarişini qəbul edir.") },
    { id: "edu", icon: GraduationCap, title: t("Kurs və təhsil"), text: t("Köməkçi kurslar, qiymət və cədvəl haqqında danışır, kursa yazılışı qəbul edir.") },
    { id: "other", icon: MoreHorizontal, title: t("Digər"), text: t("Köməkçi suallara sənin məlumatına əsasən cavab verir. Qalanını sonra qurarsan.") },
  ];
}

/** Sınaq addımı üçün hazır suallar */
export function testIdeas(type: BizType | undefined, t: T): string[] {
  switch (type) {
    case "service": return [t("Qiymətləriniz neçədir?"), t("Sabah boş vaxtınız var?"), t("Yazılmaq istəyirəm")];
    case "food": return [t("Menyunuzda nə var?"), t("Çatdırılma neçəyədir?"), t("Sifariş vermək istəyirəm")];
    case "edu": return [t("Hansı kurslarınız var?"), t("Qiyməti neçədir?"), t("Kursa yazılmaq istəyirəm")];
    case "shop": case "social": return [t("Qiymətlər neçədir?"), t("Çatdırılma var?"), t("Sifariş vermək istəyirəm")];
    default: return [];
  }
}

const field = (key: string, label: string, type: OrderForm["fields"][number]["type"], required: boolean, description?: string) => ({ key, label, type, required, ...(description && { description }) });
function orderPreset(type: BizType, t: T, items: string[]): OrderForm | null {
  if (type === "food") return { enabled: true, title: t("Yemək sifarişi"), fields: [field("name", t("Ad"), "text", true), field("phone", t("Telefon"), "phone", true), field("order", t("Sifariş"), "text", true, t("Nə və neçə ədəd")), field("address", t("Ünvan"), "address", true), field("time", t("Çatdırılma vaxtı"), "text", false)] };
  if (type === "edu") {
    const opts = items.slice(0, 30);
    return { enabled: true, title: t("Kursa yazılış"), fields: [field("name", t("Ad"), "text", true), field("phone", t("Telefon"), "phone", true), opts.length >= 2 ? { ...field("course", t("Kurs"), "select", true), options: opts } : field("course", t("Kurs"), "text", true), field("time", t("Uyğun vaxt"), "text", false)] };
  }
  if (type === "shop" || type === "social") return { enabled: true, title: t("Sifariş"), fields: [field("name", t("Ad"), "text", true), field("phone", t("Telefon"), "phone", true), field("product", t("Məhsul"), "text", true, t("Məhsulun adı, ölçü/rəng və sayı")), field("address", t("Ünvan"), "address", true, t("Rayon, küçə, ev"))] };
  return null;
}

/** "Saç kəsimi — 60 dəq — 15 AZN" → xidmət. Müddət yazılmayıbsa 60 dəqiqə. */
export function parseServices(text: string): BookingService[] {
  const out: BookingService[] = [];
  for (const line of text.split("\n")) {
    const parts = line.split(/\s+[—–\-|:]\s+|\s*[—–|]\s*/).map((x) => x.trim()).filter(Boolean);
    const name = parts[0]?.slice(0, 60);
    if (!name || out.some((s) => s.name.toLowerCase() === name.toLowerCase())) continue;
    const rest = parts.slice(1).join(" ");
    const m = rest.match(/(\d+(?:[.,]\d+)?)\s*(saat|h\b|час)/i);
    const d = rest.match(/(\d+)\s*(dəq|deq|dk|min|мин)/i);
    const duration = Math.min(480, Math.max(5, d ? Number(d[1]) : m ? Math.round(Number(m[1].replace(",", ".")) * 60) : 60));
    const price = parts.slice(1).find((x) => /\d/.test(x) && !/(dəq|deq|dk|min|мин|saat|час)/i.test(x));
    out.push({ name, duration, ...(price && { price: price.slice(0, 30) }) });
    if (out.length >= 30) break;
  }
  return out;
}
const names = (text: string) => text.split("\n").map((l) => l.split(/\s+[—–\-|:]\s+|\s*[—–|]\s*/)[0]?.trim().slice(0, 60) ?? "").filter(Boolean);
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Məlumat addımının yuxarısında: bir neçə sahə → işləyən köməkçi */
export function QuickStart({ type, onDone }: { type: BizType; onDone: () => void }) {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const company = tenant?.config.profile?.company ?? {};
  // Bu növ üçün əvvəl yazılmış qaralama (varsa)
  const d = tenant?.setup?.drafts?.[type] ?? {};
  const s = (k: string, def: string) => (typeof d[k] === "string" ? (d[k] as string) : def);
  const b = (k: string, def: boolean) => (typeof d[k] === "boolean" ? (d[k] as boolean) : def);
  const [c, setC] = useState<CompanyInfo>({ phone: s("phone", company.phone ?? ""), whatsapp: s("whatsapp", company.whatsapp ?? ""), address: s("address", company.address ?? ""), hours: s("hours", company.hours ?? "") });
  const [list, setList] = useState(s("list", ""));
  const [delivery, setDelivery] = useState(s("delivery", ""));
  const [from, setFrom] = useState(s("from", "10:00"));
  const [to, setTo] = useState(s("to", "19:00"));
  const [sat, setSat] = useState(b("sat", true));
  const [sun, setSun] = useState(b("sun", false));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);
  // Bu biznes üçün qoşulacaq imkanlar: ekranda görünür, sahib istəmədiyini söndürür
  const [useBook, setUseBook] = useState(b("useBook", true));
  const [capacity, setCapacity] = useState(typeof d.capacity === "number" ? d.capacity : 1);
  const [useRem, setUseRem] = useState(b("useRem", true));
  const [useOrder, setUseOrder] = useState(b("useOrder", type !== "other"));
  const [useFu, setUseFu] = useState(b("useFu", type === "social" || type === "food"));
  // Sahibin özünün qurduqları (sehirbazın əvvəlki dəfə yaratdıqları sayılmır: onlar yenidən hazırlananda əvəz olunur)
  const made = tenant?.setup?.made?.type === type ? tenant.setup.made : undefined;
  const [has, setHas] = useState<{ booking: boolean; order: boolean; fu: boolean }>({ booking: false, order: false, fu: false });
  useEffect(() => {
    void Promise.all([getBooking().catch(() => null), getOrderForm().catch(() => null), getFollowup().catch(() => null)])
      .then(([bk, o, f]) => setHas({ booking: Boolean(bk?.booking) && !made?.booking, order: Boolean(o?.form) && !made?.orderForm, fu: Boolean(f?.followup.enabled) && !made?.followup }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Qaralama: yazmağı dayandırandan 1 saniyə sonra serverdə saxlanır
  const values = { ...c, list, delivery, from, to, sat, sun, capacity, useBook, useRem, useOrder, useFu };
  const key = JSON.stringify(values);
  const firstKey = useRef(key);
  useEffect(() => {
    if (key === firstKey.current) return;
    const id = setTimeout(() => { void saveSetupDraft(type, JSON.parse(key)).catch(() => {}); }, 1000);
    return () => clearTimeout(id);
  }, [key, type]);
  const service = type === "service";
  const sells = type === "shop" || type === "social" || type === "food";
  const L = {
    shop: [t("Məhsullar və qiymətlər"), t("Simsiz qulaqlıq X2 — 45 AZN\nSmart saat Pro — 120 AZN")],
    social: [t("Məhsullar və qiymətlər"), t("Qadın çantası (qara, bej) — 35 AZN\nDəri pul kisəsi — 20 AZN")],
    service: [t("Xidmətlər, müddət və qiymət"), t("Saç kəsimi — 60 dəq — 15 AZN\nManikür — 45 dəq — 20 AZN")],
    food: [t("Menyu və qiymətlər"), t("Plov — 8 AZN\nDönər (toyuq) — 5 AZN")],
    edu: [t("Kurslar, müddət və qiymət"), t("İngilis dili A1 — 3 ay — 120 AZN/ay\nRiyaziyyat (abituriyent) — 9 ay — 100 AZN/ay")],
    other: [t("Nə təklif edirsən və qiymətlər"), t("Xidmət və ya məhsulun adı — qiyməti")],
  }[type];

  async function run() {
    if (service && (!HM.test(from) || !HM.test(to) || to <= from)) { toast.error(t("İş saatını düzgün yaz, məs. 10:00 — 19:00")); return; }
    setBusy(true);
    const made: string[] = [];
    const rec = { type, kbSources: [] as string[], booking: false, orderForm: false, followup: false };
    try {
      // Əvvəlki dəfə sehirbazın yaratdıqları silinir (məs. köhnə xidmət siyahısı, köhnə sifariş forması)
      await resetQuickstart();
      const hours = service ? `${from}–${to}${sat ? "" : `, ${t("şənbə bağlı")}`}${sun ? "" : `, ${t("bazar bağlı")}`}` : c.hours?.trim();
      const comp = { ...company, ...Object.fromEntries(Object.entries({ ...c, hours }).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v)) };
      if (Object.values(comp).some(Boolean)) { await saveProfile({ company: comp }); made.push(t("Əlaqə məlumatı")); }
      if (list.trim()) { rec.kbSources.push((await kbAddText(L[0], list.trim())).source.id); made.push(L[0]); }
      if (sells && delivery.trim()) { rec.kbSources.push((await kbAddText(t("Çatdırılma və ödəniş"), delivery.trim())).source.id); made.push(t("Çatdırılma və ödəniş")); }
      if (service) {
        const services = parseServices(list);
        const existing = (await getBooking().catch(() => ({ booking: null }))).booking;
        if (useBook && !existing && services.length) {
          const day = { from, to };
          await saveBooking({ enabled: true, services, days: [sun ? day : null, day, day, day, day, day, sat ? day : null], step: 30, capacity: Math.min(20, Math.max(1, capacity || 1)), noticeMin: 60, horizonDays: 30, closedDates: [], reminders: useRem });
          rec.booking = true;
          made.push(useRem ? t("Randevu təqvimi və xatırlatma") : t("Randevu qəbulu"));
        }
      } else if (useOrder) {
        const form = orderPreset(type === "other" ? "shop" : type, t, names(list));
        const existing = form ? (await getOrderForm().catch(() => ({ form: null }))).form : null;
        if (form && !existing) { await saveOrderForm(form); rec.orderForm = true; made.push(form.title ?? t("Sifariş forması")); }
      }
      if (useFu && type !== "service") {
        const f = await getFollowup().catch(() => null);
        if (f && !f.followup.enabled) { await saveFollowup({ ...f.followup, enabled: true }); rec.followup = true; made.push(t("Susan müştəriyə xatırlatma")); }
      }
      if (!made.length) { toast.error(t("Ən azı bir sahəni doldur.")); return; }
      await saveSetupMade(rec);
      await refresh();
      setDone(made);
      onDone();
      toast.success(t("Köməkçi hazırdır. İndi sına."));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (done) return (
    <div className="flex flex-col gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-semibold"><CircleCheck size={17} aria-hidden />{t("Köməkçi hazırdır")}</p>
      <ul className="flex flex-wrap gap-1.5">{done.map((x) => <li key={x} className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium">{x}</li>)}</ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-foreground/20 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background"><Wand2 size={17} aria-hidden /></span>
        <div><p className="font-semibold">{t("Sürətli başlanğıc")}</p><p className="text-sm text-muted-foreground">{t("Bunları yaz, köməkçi dərhal işləsin. Sayt və fayl əlavə etmək sonra da olar.")}</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5"><Label htmlFor="qs-phone">{t("Telefon")}</Label><Input id="qs-phone" value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="+994 12 000 00 00" /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="qs-wa">WhatsApp</Label><Input id="qs-wa" value={c.whatsapp ?? ""} onChange={(e) => setC({ ...c, whatsapp: e.target.value })} placeholder="+994 50 000 00 00" /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="qs-addr">{t("Ünvan")}</Label><Input id="qs-addr" value={c.address ?? ""} onChange={(e) => setC({ ...c, address: e.target.value })} placeholder={t("məs. Bakı, Nizami küç. 10")} /></div>
      </div>
      {service ? (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
          <legend className="mb-1.5 text-sm font-medium">{t("İş saatları")}</legend>
          <Input type="time" aria-label={t("Açılış")} value={from} onChange={(e) => setFrom(e.target.value)} className="w-32" />
          <span className="text-muted-foreground">—</span>
          <Input type="time" aria-label={t("Bağlanış")} value={to} onChange={(e) => setTo(e.target.value)} className="w-32" />
          <label className="ml-2 inline-flex items-center gap-1.5"><input type="checkbox" checked={sat} onChange={(e) => setSat(e.target.checked)} />{t("Şənbə işləyirik")}</label>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={sun} onChange={(e) => setSun(e.target.checked)} />{t("Bazar işləyirik")}</label>
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1.5"><Label htmlFor="qs-hours">{t("İş saatları")}</Label><Input id="qs-hours" value={c.hours ?? ""} onChange={(e) => setC({ ...c, hours: e.target.value })} placeholder={t("məs. Hər gün 10:00–20:00")} /></div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qs-list">{L[0]}</Label>
        <Textarea id="qs-list" rows={4} value={list} onChange={(e) => setList(e.target.value)} placeholder={L[1]} />
        <p className="text-xs text-muted-foreground">{service ? t("Hər sətirdə bir xidmət: ad — müddət — qiymət. Bunlardan randevu təqvimi qurulur.") : t("Hər sətirdə biri. Hamısını yazmaq vacib deyil, əsasları kifayətdir.")}</p>
      </div>
      {sells && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qs-del">{t("Çatdırılma və ödəniş")}</Label>
          <Textarea id="qs-del" rows={2} value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder={t("məs. Bakı daxili 1 günə, 3 AZN. 50 AZN-dən yuxarı pulsuz. Ödəniş nağd və ya kartla.")} />
        </div>
      )}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("Bu biznes üçün qoşulacaq")}</p>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {service ? <>
            <Feature icon={CalendarClock} title={t("Randevu qəbulu")} text={t("AI boş vaxtı təklif edir, təsdiq alandan sonra müştərini yazır. Eyni vaxta iki nəfər yazılmır.")} on={useBook} set={setUseBook} ready={has.booking}>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">{t("Eyni anda neçə müştəri qəbul edirsən")}
                <Input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="h-8 w-16" aria-label={t("Eyni anda neçə müştəri qəbul edirsən")} /></label>
            </Feature>
            <Feature icon={Bell} title={t("Randevu xatırlatması")} text={t("Telegram və WhatsApp-dan yazılan müştəriyə bir gün əvvəl avtomatik mesaj.")} on={useBook && useRem} set={setUseRem} ready={has.booking} disabled={!useBook} />
          </> : <>
            <Feature icon={ShoppingBag} title={type === "edu" ? t("Kursa yazılış") : type === "food" ? t("Yemək sifarişi") : t("Sifariş qəbulu")} text={t("AI bu məlumatları söhbətdə soruşur, xülasəni göstərib təsdiq alır və sifarişi sənə göndərir:")} on={useOrder} set={setUseOrder} ready={has.order}>
              <span className="mt-1.5 flex flex-wrap gap-1">{(orderPreset(type === "other" ? "shop" : type, t, names(list))?.fields ?? []).map((f) => <span key={f.key} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{f.label}</span>)}</span>
            </Feature>
            <Feature icon={Bell} title={t("Susan müştəriyə xatırlatma")} text={t("Telegram və WhatsApp-da müştəri cavabdan sonra 2 saat susarsa, bir dəfə nəzakətli mesaj.")} on={useFu} set={setUseFu} ready={has.fu} />
          </>}
          <Feature icon={Headset} title={t("Ağıllı operator çağırışı")} text={t("Müştəri narazıdırsa, almağa hazırdırsa və ya AI kömək edə bilmirsə, söhbət səbəbi ilə operatora düşür.")} on set={() => {}} ready={false} fixed />
        </ul>
        <p className="text-xs text-muted-foreground">{t("Hamısını sonra Köməkçi və Kanallar bölmələrində dəyişə bilərsən.")}</p>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={run} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}{t("Köməkçini hazırla")}</Button>
      </div>
    </div>
  );
}

/** Qoşulacaq imkan sətri: ad, qısa izah, açar (və ya "artıq qurulub" / "həmişə açıq") */
function Feature({ icon: Icon, title, text, on, set, ready, fixed, disabled, children }: { icon: React.ElementType; title: string; text: string; on: boolean; set: (v: boolean) => void; ready: boolean; fixed?: boolean; disabled?: boolean; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <li className={cn("flex items-start gap-3 p-3 text-sm", disabled && "opacity-50")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><Icon size={16} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
        {on && !ready && children}
      </div>
      {fixed ? <span className="shrink-0 text-xs font-medium text-emerald-700">{t("Həmişə açıq")}</span>
        : ready ? <span className="shrink-0 text-xs font-medium text-emerald-700">{t("Artıq qurulub")}</span>
        : <Switch checked={on} onChange={set} disabled={disabled} label={title} />}
    </li>
  );
}

/** Yayımla addımı: nə qoşulub (bir baxışda) + ilk həftə üçün qaralama rejimi */
export function ReadySummary() {
  const { t } = useI18n();
  const [s, setS] = useState<{ kb: number; order: boolean; booking: boolean; followup: boolean; draft: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([getKb().catch(() => null), getOrderForm().catch(() => null), getBooking().catch(() => null), getFollowup().catch(() => null), getAiMode().catch(() => null)]).then(([kb, o, b, f, m]) => setS({
      kb: (kb?.sources ?? []).filter((x) => x.status === "ready").length, order: Boolean(o?.form?.enabled), booking: Boolean(b?.booking?.enabled), followup: Boolean(f?.followup.enabled),
      draft: m?.aiMode.telegram === "draft" && m?.aiMode.whatsapp === "draft",
    }));
  }, []);
  if (!s) return null;
  async function draft(v: boolean) {
    setBusy(true);
    try { const r = await saveAiMode({ telegram: v ? "draft" : "auto", whatsapp: v ? "draft" : "auto" }); setS((x) => x && { ...x, draft: r.aiMode.telegram === "draft" }); toast.success(t("Saxlandı.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const rows: [React.ElementType, string, boolean, string][] = [
    [BookOpen, s.kb ? t("Bilik bazası: {n} mənbə", { n: s.kb }) : t("Bilik bazası"), s.kb > 0, "/knowledge"],
    [ShoppingBag, t("Sifariş qəbulu"), s.order, "/orders"],
    [CalendarClock, t("Randevu qəbulu"), s.booking, "/bookings"],
    [Headset, t("Ağıllı operator çağırışı"), true, "/channels"],
    [Sparkles, t("Susan müştəriyə xatırlatma"), s.followup, "/channels"],
  ];
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div><h2 className="text-lg font-semibold">{t("Sənin üçün hazırdır")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Bunlar artıq işləyir. Hər birini sonra dəyişə bilərsən.")}</p></div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.filter((r) => r[2]).map(([Icon, label, , href]) => (
          <li key={label}><Link href={href} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm hover:border-foreground/40">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><Icon size={16} aria-hidden /></span>
            <span className="min-w-0 flex-1 font-medium">{label}</span>
            <CircleCheck size={16} className="shrink-0 text-emerald-600" aria-hidden />
          </Link></li>
        ))}
      </ul>
      <div className={cn("flex items-start gap-3 rounded-xl bg-muted/50 p-3 text-sm", busy && "opacity-60")}>
        <Switch checked={s.draft} onChange={draft} label={t("İlk günlər cavablara özüm baxım")} />
        <span><span className="block font-medium">{t("İlk günlər cavablara özüm baxım")}</span><span className="block text-muted-foreground">{t("Telegram və WhatsApp-da AI müştəriyə özü yazmır, cavabı hazırlayır, sən bir kliklə göndərirsən. Güvənəndə söndür.")}</span></span>
      </div>
    </section>
  );
}