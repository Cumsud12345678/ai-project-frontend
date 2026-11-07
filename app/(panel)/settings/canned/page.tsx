"use client";
import { useEffect, useState } from "react";
import { Hash, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCanned, saveCanned, type CannedReply } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";

type Draft = Omit<CannedReply, "id"> & { id?: string };
const MAX = 30;

/** Operatorların canlı söhbətdə bir kliklə seçib göndərdiyi hazır cavablar. */
function Canned() {
  const { t } = useI18n();
  const [items, setItems] = useState<Draft[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ d: Draft; index: number | null } | null>(null);
  const [del, setDel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getCanned().then((r) => setItems(r.items)).catch(() => setItems([])); }, []);

  // Bütün siyahı bir dəfəyə saxlanır (server ID-ləri təyin edir)
  async function persist(next: Draft[], msg: string) {
    setBusy(true);
    try { const r = await saveCanned(next); setItems(r.items); toast.success(msg); return true; }
    catch (err) { toast.error((err as Error).message); return false; }
    finally { setBusy(false); }
  }

  const list = items ?? [];
  const needle = q.trim().toLowerCase();
  const shown = list.map((r, i) => ({ r, i })).filter(({ r }) => !needle || r.title.toLowerCase().includes(needle) || r.text.toLowerCase().includes(needle));
  const valid = !!edit && edit.d.title.trim() && edit.d.text.trim();
  const dup = !!edit && list.some((r, i) => i !== edit.index && r.title.trim().toLowerCase() === edit.d.title.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Hazır cavablar")}
        description={t("Operatorlar canlı söhbətdə bir kliklə seçib mətni redaktə edib göndərir. Ən çox 30.")}
        actions={<Button onClick={() => setEdit({ d: { title: "", text: "" }, index: null })} disabled={!items || list.length >= MAX}><Plus size={16} aria-hidden />{t("Yeni hazır cavab")}</Button>} />

      {list.length > 5 && (
        <div className="relative max-w-sm">
          <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Axtar")} aria-label={t("Axtar")} className="pl-9" />
        </div>
      )}

      {items && !list.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><Hash size={22} aria-hidden /></span>
          <h3 className="font-semibold">{t("Hələ hazır cavab yoxdur")}</h3>
          <p className="max-w-md text-sm text-muted-foreground">{t("Tez-tez yazdığın cavabları (çatdırılma, ödəniş, zəmanət) bir dəfə yaz, söhbətdə bir kliklə göndər.")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="w-56 px-4 py-3 font-medium">{t("Ad")}</th><th className="px-4 py-3 font-medium">{t("Mətn")}</th><th className="w-12" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map(({ r, i }) => (
                <tr key={r.id ?? i} className="cursor-pointer hover:bg-muted/40" onClick={() => setEdit({ d: { ...r }, index: i })}>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="max-w-0 px-4 py-3 text-muted-foreground"><p className="truncate">{r.text}</p></td>
                  <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu items={[{ label: t("Redaktə et"), icon: Pencil, run: () => setEdit({ d: { ...r }, index: i }) }, { label: t("Sil"), icon: Trash2, danger: true, run: () => setDel(i) }]} />
                  </td>
                </tr>
              ))}
              {!shown.length && items && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">{t("Heç nə tapılmadı.")}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {items && <p className="text-xs text-muted-foreground tabular-nums">{list.length} / {MAX}</p>}

      <Modal open={!!edit} onClose={() => setEdit(null)} busy={busy} title={edit?.index === null ? t("Yeni hazır cavab") : t("Hazır cavabı redaktə et")}
        footer={<><Button variant="outline" onClick={() => setEdit(null)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="canned-form" disabled={!valid || dup || busy}>{busy ? t("Saxlanır…") : t("Saxla")}</Button></>}>
        {edit && (
          <form id="canned-form" className="flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault();
            if (!valid || dup) return;
            const d = { ...edit.d, title: edit.d.title.trim(), text: edit.d.text.trim() };
            if (await persist(edit.index === null ? [...list, d] : list.map((x, j) => (j === edit.index ? d : x)), t("Saxlandı."))) setEdit(null);
          }}>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cn-title">{t("Ad")}</Label>
              <Input id="cn-title" value={edit.d.title} maxLength={40} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, title: e.target.value } })} placeholder={t("Məsələn: Çatdırılma müddəti")} />
              {dup && <p className="text-xs text-destructive">{t("Bu adda hazır cavab artıq var.")}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cn-text">{t("Mətn")}</Label>
              <Textarea id="cn-text" rows={6} value={edit.d.text} maxLength={1000} onChange={(e) => setEdit({ ...edit, d: { ...edit.d, text: e.target.value } })} />
              <p className="text-right text-xs text-muted-foreground tabular-nums">{edit.d.text.length}/1000</p>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={del !== null} onClose={() => setDel(null)} busy={busy} size="sm" title={t("Hazır cavab silinsin?")}
        footer={<><Button variant="outline" onClick={() => setDel(null)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={async () => { if (del !== null && await persist(list.filter((_, j) => j !== del), t("Silindi."))) setDel(null); }}>{t("Sil")}</Button></>}>
        <p className="text-sm font-medium">{del !== null ? list[del]?.title : ""}</p>
      </Modal>
    </div>
  );
}

export default function CannedPage() {
  return <RequireTenant><Canned /></RequireTenant>;
}
