"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminAnnouncement, adminDeleteAnnouncement, adminSetAnnouncement, type Announcement } from "@/lib/api";
import { AnnouncementView } from "@/components/announcement-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
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
    try { await adminDeleteAnnouncement(); setCur(null); setText(""); toast.success(t("Elan silindi.")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">{t("Elan")}</h1>
        <p className="text-sm text-muted-foreground">{t("Yazdığın mətn giriş etmiş bütün müştərilərin panelinin yuxarısında görünür. İstifadəçi onu bağlaya bilər.")}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("Mətn")}</CardTitle>
          <CardDescription>{cur ? (cur.active ? t("İndi yayımdadır") : t("Hazırda gizlidir")) : t("Aktiv elan yoxdur")}{cur && ` · ${cur.by} · ${date(cur.updatedAt)}`}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ann">{t("Elan mətni")}</Label>
            <textarea id="ann" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={3} disabled={!loaded}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary" placeholder={t("məs. Bu gecə 02:00–03:00 arası texniki işlər olacaq")} />
            <p className="text-xs text-muted-foreground tabular-nums">{text.length} / 300</p>
          </div>
          <Segmented value={level} onChange={setLevel} label={t("Növ")} options={[{ value: "info", label: t("Məlumat") }, { value: "warn", label: t("Xəbərdarlıq") }, { value: "critical", label: t("Vacib") }]} />
          {text.trim() && <div><p className="mb-2 text-xs text-muted-foreground">{t("Müştəri belə görəcək")}</p><AnnouncementView text={text.trim()} level={level} /></div>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !text.trim()} onClick={() => save(true)}>{t("Yayımla")}</Button>
            {cur?.active && <Button variant="outline" disabled={busy} onClick={() => save(false)}>{t("Gizlət")}</Button>}
            {cur && <Button variant="outline" disabled={busy} onClick={remove}>{t("Sil")}</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
