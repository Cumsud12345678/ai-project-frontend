"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOrderForm, getOrderForm, saveOrderForm, type OrderField, type OrderFieldType, type OrderForm } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SwitchRow } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { OrdersBoard } from "@/components/orders-board";

type Row = OrderField & { optionsText: string };
const MAX = 12;
const TYPES: OrderFieldType[] = ["text", "phone", "email", "number", "select", "address"];

/** Sahənin adından texniki açar: "Ad soyad" → "ad_soyad", "Ünvan" → "unvan" */
const slug = (label: string, used: Set<string>) => {
  const map: Record<string, string> = { ə: "e", ö: "o", ü: "u", ğ: "g", ı: "i", ç: "c", ş: "s", İ: "i" };
  let k = label.toLowerCase().replace(/[əöüğıçşİ]/g, (c) => map[c] ?? c).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28);
  if (!/^[a-z]/.test(k)) k = `f_${k}`.slice(0, 28);
  if (k.length < 2) k = "field";
  let out = k, n = 2;
  while (used.has(out)) out = `${k}_${n++}`;
  used.add(out);
  return out;
};

const STARTER = (t: (s: string) => string): Row[] => [
  { key: "name", label: t("Ad"), type: "text", required: true, optionsText: "" },
  { key: "phone", label: t("Telefon"), type: "phone", required: true, optionsText: "" },
  { key: "product", label: t("Məhsul"), type: "text", required: true, optionsText: "" },
  { key: "address", label: t("Ünvan"), type: "address", required: false, description: t("Rayon, küçə, ev"), optionsText: "" },
];

function OrderFormTab() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [success, setSuccess] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const fill = (f: OrderForm | null) => {
    setExists(Boolean(f));
    setEnabled(f?.enabled ?? true);
    setTitle(f?.title ?? "");
    setInstructions(f?.instructions ?? "");
    setSuccess(f?.successMessage ?? "");
    setRows(f ? f.fields.map((x) => ({ ...x, optionsText: x.options?.join(", ") ?? "" })) : STARTER(t));
  };
  useEffect(() => { getOrderForm().then((r) => fill(r.form)).catch((e) => toast.error((e as Error).message)).finally(() => setLoaded(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const hasContact = rows.some((x) => (x.type === "phone" || x.type === "email") && x.required);
  const typeLabel: Record<OrderFieldType, string> = { text: t("Mətn"), phone: t("Telefon"), email: t("E-poçt"), number: t("Rəqəm"), select: t("Seçim"), address: t("Ünvan") };

  async function save() {
    // Açarlar addan avtomatik qurulur (mövcud sahənin açarı dəyişmir: köhnə sifarişlərlə uyğun qalsın)
    const used = new Set(rows.filter((x) => x.key).map((x) => x.key));
    const fields: OrderField[] = rows.filter((x) => x.label.trim()).map((x) => ({
      key: x.key || slug(x.label, used), label: x.label.trim(), type: x.type, required: x.required,
      ...(x.description?.trim() && { description: x.description.trim() }),
      ...(x.type === "select" && { options: x.optionsText.split(",").map((o) => o.trim()).filter(Boolean) }),
    }));
    setBusy(true);
    try {
      const r = await saveOrderForm({ enabled, fields, ...(title.trim() && { title: title.trim() }), ...(instructions.trim() && { instructions: instructions.trim() }), ...(success.trim() && { successMessage: success.trim() }) });
      fill(r.form);
      toast.success(t("Saxlandı."));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (!loaded) return <FormSkeleton />;
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">{t("Saytınızın API-si lazım deyil. AI müştəridən bu məlumatları söhbətdə bir-bir soruşur, xülasəni göstərib təsdiq alır və sifarişi Müraciətlərə göndərir. Siz e-poçtla (və qoşulubsa Telegram qrupu və ya Bitrix24 ilə) dərhal xəbər alırsınız.")}</p>

      <SwitchRow checked={enabled} onChange={setEnabled} title={t("Çatda sifariş qəbul et")} description={t("Sayt vidjeti, Telegram və WhatsApp-da işləyir.")} on={t("Aktiv")} off={t("Söndürülüb")} />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="of-title">{t("Sifarişin adı")}</Label>
            <Input id="of-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={t("Məsələn: Tort sifarişi, Qeydiyyat, Rezerv")} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="of-success">{t("Təşəkkür mesajı")}</Label>
            <Input id="of-success" value={success} maxLength={300} onChange={(e) => setSuccess(e.target.value)} placeholder={t("Məsələn: 1 saat ərzində zəng edəcəyik")} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="of-rules">{t("Sifariş qaydaları")}</Label>
          <Textarea id="of-rules" rows={3} value={instructions} maxLength={1500} onChange={(e) => setInstructions(e.target.value)} placeholder={t("Çatdırılma qiyməti və müddəti, ödəniş üsulları, minimum sifariş. AI yalnız buna əsaslanır, uydurmur.")} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t("Soruşulacaq məlumatlar")}</h2>
          <Button variant="outline" size="sm" disabled={rows.length >= MAX} onClick={() => setRows((r) => [...r, { key: "", label: "", type: "text", required: false, optionsText: "" }])}><Plus size={14} aria-hidden />{t("Sahə əlavə et")}</Button>
        </div>
        {!hasContact && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("Ən azı bir məcburi Telefon və ya E-poçt sahəsi olmalıdır: müştəri ilə əlaqə saxlamaq üçün.")}</p>}
        <ul className="flex flex-col gap-2">
          {rows.map((x, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_9rem]">
                <Input aria-label={t("Sahənin adı")} value={x.label} maxLength={60} onChange={(e) => set(i, { label: e.target.value })} placeholder={t("Sahənin adı (məs. Ünvan)")} />
                <select aria-label={t("Növ")} value={x.type} onChange={(e) => set(i, { type: e.target.value as OrderFieldType })} className="h-10 rounded-md border border-border bg-card px-2 text-sm">
                  {TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel[ty]}</option>)}
                </select>
                {x.type === "select" && <Input className="sm:col-span-2" aria-label={t("Variantlar")} value={x.optionsText} onChange={(e) => set(i, { optionsText: e.target.value })} placeholder={t("Variantlar, vergüllə: Kiçik, Orta, Böyük")} />}
                <Input className="sm:col-span-2" aria-label={t("İzah")} value={x.description ?? ""} maxLength={200} onChange={(e) => set(i, { description: e.target.value })} placeholder={t("İzah AI üçün (istəyə bağlı)")} />
              </div>
              <div className="flex items-center gap-1">
                <label className="mr-2 inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={x.required} onChange={(e) => set(i, { required: e.target.checked })} />{t("Məcburi")}</label>
                <Button size="sm" variant="ghost" aria-label={t("Yuxarı")} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} aria-hidden /></Button>
                <Button size="sm" variant="ghost" aria-label={t("Aşağı")} disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} aria-hidden /></Button>
                <Button size="sm" variant="ghost" aria-label={t("Sil")} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}><Trash2 size={14} aria-hidden /></Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground tabular-nums">{rows.length} / {MAX}</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={busy || !hasContact || !rows.some((x) => x.label.trim())}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        <Link href="/playground" className="text-sm text-primary underline">{t("Sınaq söhbətində yoxla")}</Link>
        {exists && <Button variant="ghost" className="ml-auto text-destructive" onClick={() => setConfirmDel(true)}><Trash2 size={14} aria-hidden />{t("Formanı sil")}</Button>}
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShoppingBag size={14} className="mt-0.5 shrink-0" aria-hidden />{t("Gələn sifarişlər Müraciətlər bölməsində sahələri ilə görünür. Sınaq söhbətində verilən sifariş də ora düşür.")}</p>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} busy={busy} size="sm" title={t("Sifariş forması silinsin?")}
        footer={<><Button variant="outline" onClick={() => setConfirmDel(false)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await deleteOrderForm(); fill(null); setConfirmDel(false); toast.success(t("Silindi.")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
        }}>{t("Sil")}</Button></>}>
        <p className="text-sm text-muted-foreground">{t("AI çatda sifariş qəbul etməyi dayandıracaq. Artıq gəlmiş sifarişlər Müraciətlərdə qalır.")}</p>
      </Modal>
    </div>
  );
}

function Orders() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"board" | "form">("board");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Sifariş qəbulu")} description={t("Sifarişləri mərhələlərlə izlə: mərhələ dəyişəndə müştəri avtomatik xəbər alır.")} />
      <Tabs value={tab} onChange={setTab} label={t("Sifariş qəbulu")} items={[{ value: "board", label: t("Lövhə") }, { value: "form", label: t("Forma") }]} />
      {tab === "board" ? <OrdersBoard /> : <OrderFormTab />}
    </div>
  );
}

export default function OrdersPage() {
  return <RequireTenant><Orders /></RequireTenant>;
}
