"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Copy, Megaphone, Trash2 } from "lucide-react";
import { adminAnnouncement, adminDeleteAnnouncement, adminDeleteAnnouncementHistory, adminSetAnnouncement, type Announcement, type AnnouncementView as View } from "@/lib/api";
import { AnnouncementView } from "@/components/announcement-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { RowMenu } from "@/components/ui/row-menu";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n";

const EXPIRES: { h: number | null; label: string }[] = [
  { h: null, label: "Özüm silənə qədər" }, { h: 1, label: "1 saat" }, { h: 6, label: "6 saat" }, { h: 24, label: "1 gün" }, { h: 72, label: "3 gün" }, { h: 168, label: "1 həftə" },
];

/** Bütün müştərilərin panelinin yuxarısında göstərilən elan: müddəti bitəndə özü gizlənir, keçmiş elanlar təkrar istifadə və ya silinə bilər. */
export default function AdminAnnouncementPage() {
  const { t, date } = useI18n();
  const [v, setV] = useState<View | null>(null);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<Announcement["level"]>("info");
  const [expires, setExpires] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const apply = (r: View, fill = false) => { setV(r); if (fill && r.announcement) { setText(r.announcement.text); setLevel(r.announcement.level); } };
  useEffect(() => { adminAnnouncement().then((r) => apply(r, true)).catch((e: Error) => toast.error(e.message)); }, []);

  const cur = v?.announcement ?? null;
  const live = Boolean(cur?.active && !v?.expired);
  const run = async (fn: () => Promise<View>, ok: string) => {
    setBusy(true);
    try { apply(await fn()); toast.success(ok); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  };
  const publish = () => run(() => adminSetAnnouncement({ text: text.trim(), level, active: true, expiresInH: expires }), t("Elan yayımlandı."));
  const hide = () => run(() => adminSetAnnouncement({ text: cur!.text, level: cur!.level, active: false }), t("Elan gizlədildi."));
  const remove = async () => { if (await run(adminDeleteAnnouncement, t("Elan silindi."))) { setText(""); setDel(false); } };
  const unchanged = live && cur!.text === text.trim() && cur!.level === level && expires === null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("Elan")} description={t("Yazdığın mətn giriş etmiş bütün müştərilərin panelinin yuxarısında görünür. İstifadəçi onu bağlaya bilər.")} />

      {cur && (
        <Card className={live ? "border-foreground/30" : ""}>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2"><Megaphone size={16} aria-hidden />{t("Hazırkı elan")}</CardTitle>
              <CardDescription>
                {cur.by} · {date(cur.updatedAt)}
                {cur.expiresAt && <> · <Clock size={12} className="inline -translate-y-px" aria-hidden /> {v?.expired ? t("müddəti bitib") : t("{d} tarixində gizlənəcək", { d: date(cur.expiresAt) })}</>}
              </CardDescription>
            </div>
            <Badge className={live ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}>{live ? t("İndi yayımdadır") : v?.expired ? t("Müddəti bitib") : t("Hazırda gizlidir")}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <AnnouncementView text={cur.text} level={cur.level} />
            <div className="flex flex-wrap justify-end gap-2">
              {live && <Button variant="outline" disabled={busy} onClick={hide}>{t("Gizlət")}</Button>}
              <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => setDel(true)}><Trash2 size={15} aria-hidden />{t("Elanı sil")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{cur ? t("Yeni elan və ya dəyişiklik") : t("Yeni elan")}</CardTitle><CardDescription>{t("Yayımlayanda hazırkı elanı əvəz edir.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ann">{t("Elan mətni")}</Label>
            <Textarea id="ann" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={3} disabled={!v} placeholder={t("məs. Bu gecə 02:00–03:00 arası texniki işlər olacaq")} />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{text.length} / 300</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1"><span className="text-sm font-medium">{t("Növ")}</span>
              <Segmented value={level} onChange={setLevel} label={t("Növ")} options={[{ value: "info", label: t("Məlumat") }, { value: "warn", label: t("Xəbərdarlıq") }, { value: "critical", label: t("Vacib") }]} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ann-exp">{t("Avtomatik gizlənsin")}</Label>
              <select id="ann-exp" value={expires ?? ""} onChange={(e) => setExpires(e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
                {EXPIRES.map((x) => <option key={x.label} value={x.h ?? ""}>{t(x.label)}</option>)}
              </select>
            </div>
          </div>
          {text.trim() && <div><p className="mb-2 text-xs text-muted-foreground">{t("Müştəri belə görəcək")}</p><AnnouncementView text={text.trim()} level={level} /></div>}
          <div className="flex justify-end border-t border-border pt-4">
            <Button disabled={busy || !text.trim() || unchanged} onClick={publish}>{live ? t("Yenilə") : t("Yayımla")}</Button>
          </div>
        </CardContent>
      </Card>

      {!!v?.history.length && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("Keçmiş elanlar")}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {v.history.map((h) => (
              <li key={h.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="break-words">{h.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{h.by} · {date(h.at)}{cur?.text === h.text && live ? ` · ${t("İndi yayımdadır")}` : ""}</p>
                </div>
                <RowMenu items={[
                  { label: t("Təkrar istifadə et"), icon: Copy, run: () => { setText(h.text); setLevel(h.level); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                  { label: t("Siyahıdan sil"), icon: Trash2, danger: true, run: () => void run(() => adminDeleteAnnouncementHistory(h.id), t("Silindi.")) },
                ]} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal open={del} onClose={() => setDel(false)} busy={busy} size="sm" title={t("Elan silinsin?")} description={t("Elan bütün müştərilərin panelindən dərhal yox olacaq.")}
        footer={<><Button variant="outline" onClick={() => setDel(false)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={remove}>{t("Sil")}</Button></>}>
        <p className="text-sm">{cur?.text}</p>
      </Modal>
    </div>
  );
}
