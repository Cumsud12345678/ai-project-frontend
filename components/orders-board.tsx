"use client";
// Sifariş lövhəsi: Yeni → Təsdiqləndi → Yoldadır → Çatdırıldı (+ Ləğv). Mərhələ dəyişəndə müştəriyə avtomatik mesaj gedə bilər:
// Telegram/WhatsApp-dan gələn sifarişdə həmin söhbətə, saytdan gələn və e-poçt yazılan sifarişdə məktubla.
import { Fragment, useCallback, useEffect, useState } from "react";
import { ArrowRight, Mail, MessageCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { getOrders, setOrderStage, type OrderCard, type OrderStage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const STAGES: OrderStage[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];
const NEXT: Partial<Record<OrderStage, OrderStage>> = { new: "confirmed", confirmed: "shipped", shipped: "delivered" };
const CHANNEL: Record<string, string> = { widget: "Sayt", telegram: "Telegram", whatsapp: "WhatsApp", api: "API" };

export function OrdersBoard() {
  const { t, short } = useI18n();
  const label: Record<OrderStage, string> = { new: t("Yeni"), confirmed: t("Təsdiqləndi"), shipped: t("Yoldadır"), delivered: t("Çatdırıldı"), cancelled: t("Ləğv olundu") };
  const [items, setItems] = useState<OrderCard[] | null>(null);
  const [open, setOpen] = useState<OrderCard | null>(null);
  const [stage, setStage] = useState<OrderStage>("new");
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { getOrders().then((r) => setItems(r.items)).catch((e) => { setItems([]); toast.error((e as Error).message); }); }, []);
  useEffect(load, [load]);

  function show(o: OrderCard, to?: OrderStage) { setOpen(o); setStage(to ?? NEXT[o.order.stage] ?? o.order.stage); setNotify(Boolean(o.order.notify)); setNote(""); }
  async function save() {
    if (!open) return;
    setBusy(true);
    try {
      const r = await setOrderStage(open.id, { stage, notify: notify && Boolean(open.order.notify) && stage !== "new", ...(note.trim() && { note: note.trim() }) });
      setItems((xs) => (xs ?? []).map((x) => (x.id === open.id ? { ...x, ...r.lead, order: { ...x.order, ...r.lead.order } } : x)));
      setOpen(null);
      if (r.notifyError) toast.error(t("Mərhələ dəyişdi, amma müştəriyə mesaj getmədi: {e}", { e: r.notifyError }));
      else toast.success(r.notified === "channel" ? t("Mərhələ dəyişdi, müştəriyə mesaj göndərildi.") : r.notified === "email" ? t("Mərhələ dəyişdi, müştəriyə məktub göndərildi.") : t("Mərhələ dəyişdi."));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (!items) return <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>;
  if (!items.length) return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
      <ShoppingBag size={28} className="text-muted-foreground" aria-hidden />
      <p className="font-medium">{t("Hələ sifariş yoxdur")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{t("AI çatda sifariş qəbul edəndə burada görünəcək. Sifariş formasını “Forma” tabında qur.")}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} aria-hidden />{t("Yenilə")}</Button></div>
      <div className="-mx-5 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
        <div className="grid min-w-[880px] grid-cols-5 gap-3">
          {STAGES.map((s) => {
            const col = items.filter((x) => x.order.stage === s);
            return (
              <section key={s} aria-label={label[s]} className="flex min-h-40 flex-col gap-2 rounded-2xl bg-muted/60 p-2">
                <h3 className="flex items-center justify-between px-2 pt-1 text-sm font-semibold">{label[s]}<span className="tabular-nums text-muted-foreground">{col.length}</span></h3>
                {col.map((o) => (
                  <article key={o.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                    <button type="button" onClick={() => show(o)} className="flex cursor-pointer flex-col gap-1 text-left">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{o.name || o.contact}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">№{o.id.slice(0, 8).toUpperCase()}</span>
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{o.order.fields.map((f) => f.value).slice(0, 3).join(" · ")}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {o.order.channel && <Badge className="px-1.5 py-0 text-[10px]">{t(CHANNEL[o.order.channel] ?? o.order.channel)}</Badge>}
                        <span className="tabular-nums">{short(o.at)}</span>
                      </span>
                    </button>
                    {NEXT[s] && <Button size="sm" variant="outline" className="justify-between" onClick={() => show(o, NEXT[s])}>{label[NEXT[s]!]}<ArrowRight size={14} aria-hidden /></Button>}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} busy={busy} title={open ? `${open.order.title} №${open.id.slice(0, 8).toUpperCase()}` : ""}
        footer={<><Button variant="outline" onClick={() => setOpen(null)} disabled={busy}>{t("Ləğv et")}</Button><Button onClick={save} disabled={busy || !open || stage === open.order.stage}>{busy ? t("Saxlanır…") : t("Saxla")}</Button></>}>
        {open && (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-muted/60 p-3">
              <dt className="text-muted-foreground">{t("Ad")}</dt><dd>{open.name || "—"}</dd>
              <dt className="text-muted-foreground">{t("Əlaqə")}</dt><dd className="break-all">{open.contact}</dd>
              {open.order.fields.map((f, i) => <Fragment key={i}><dt className="text-muted-foreground">{f.label}</dt><dd className="break-words">{f.value}</dd></Fragment>)}
            </dl>
            <div className="flex flex-col gap-2">
              <Label>{t("Mərhələ")}</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Mərhələ")}>
                {STAGES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={stage === s} onClick={() => setStage(s)}
                    className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs font-medium", stage === s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>{label[s]}</button>
                ))}
              </div>
            </div>
            {stage !== "new" && stage !== open.order.stage && (open.order.notify ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                  <span>{open.order.notify === "channel" ? <><MessageCircle size={14} className="mr-1 inline" aria-hidden />{t("Müştəriyə {ch}-da mesaj göndər", { ch: (CHANNEL[open.order.channel ?? ""] ? t(CHANNEL[open.order.channel ?? ""]!) : t("çat")) })}</> : <><Mail size={14} className="mr-1 inline" aria-hidden />{t("Müştəriyə e-poçtla xəbər ver")}</>}</span></label>
                {notify && <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("Əlavə qeyd (istəyə bağlı), məs. kuryerin nömrəsi")} aria-label={t("Əlavə qeyd")} />}
              </div>
            ) : <p className="text-xs text-muted-foreground">{t("Bu müştəriyə avtomatik mesaj göndərmək olmur (saytdan telefonla yazıb). Özün zəng et və ya yaz.")}</p>)}
          </div>
        )}
      </Modal>
    </div>
  );
}
