"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminAnnouncement, adminDeleteAnnouncement, adminSetAnnouncement, type Announcement } from "@/lib/api";
import { AnnouncementView } from "@/components/announcement-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n";

/** Bütün müştərilərin panelinin yuxarısında göstərilən elan (texniki iş, yenilik, xəbərdarlıq). */
export default function AdminAnnouncementPage() {
  const { t, date } = useI18n();
  const [cur, setCur] = useState<Announcement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<Announcement["level"]>("info");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  useEffect(() => {
    adminAnnouncement().then((r) => { setCur(r.announcement); if (r.announcement) { setText(r.announcement.text); setLevel(r.announcement.level); } }).catch((e: Error) => toast.error(e.message)).finally(() => setLoaded(true));
  }, []);

  const save = async (active: boolean) => {
    setBusy(true);
    try { const r = await adminSetAnnouncement({ text, level, active }); setCur(r.announcement); toast.success(active ? t("Elan yayımlandı.") : t("Elan gizlədildi.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await adminDeleteAnnouncement(); setCur(null); setText(""); setDel(false); toast.success(t("Elan silindi.")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("Elan")} description={t("Yazdığın mətn giriş etmiş bütün müştərilərin panelinin yuxarısında görünür. İstifadəçi onu bağlaya bilər.")} />
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{t("Mətn")}</CardTitle>
            <CardDescription>{cur ? `${cur.by} · ${date(cur.updatedAt)}` : t("Aktiv elan yoxdur")}</CardDescription>
          </div>
          {cur && <Badge className={cur.active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}>{cur.active ? t("İndi yayımdadır") : t("Hazırda gizlidir")}</Badge>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ann">{t("Elan mətni")}</Label>
            <Textarea id="ann" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={3} disabled={!loaded} placeholder={t("məs. Bu gecə 02:00–03:00 arası texniki işlər olacaq")} />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{text.length} / 300</p>
          </div>
          <Segmented value={level} onChange={setLevel} label={t("Növ")} options={[{ value: "info", label: t("Məlumat") }, { value: "warn", label: t("Xəbərdarlıq") }, { value: "critical", label: t("Vacib") }]} />
          {text.trim() && <div><p className="mb-2 text-xs text-muted-foreground">{t("Müştəri belə görəcək")}</p><AnnouncementView text={text.trim()} level={level} /></div>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {cur && <Button variant="outline" className="mr-auto text-destructive" disabled={busy} onClick={() => setDel(true)}>{t("Sil")}</Button>}
            {cur?.active && <Button variant="outline" disabled={busy} onClick={() => save(false)}>{t("Gizlət")}</Button>}
            <Button disabled={busy || !text.trim() || (cur?.active && cur.text === text.trim() && cur.level === level)} onClick={() => save(true)}>{cur?.active ? t("Yenilə") : t("Yayımla")}</Button>
          </div>
        </CardContent>
      </Card>
      <Modal open={del} onClose={() => setDel(false)} busy={busy} size="sm" title={t("Elan silinsin?")} description={t("Elan bütün müştərilərin panelindən dərhal yox olacaq.")}
        footer={<><Button variant="outline" onClick={() => setDel(false)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" disabled={busy} onClick={remove}>{t("Sil")}</Button></>}>
        <p className="text-sm">{cur?.text}</p>
      </Modal>
    </div>
  );
}
