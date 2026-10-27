"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWidgetLogo, saveWidget, uploadWidgetLogo, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

type Theme = "light" | "dark" | "auto";
const LOGO_MAX = 100 * 1024;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Fon rənginə görə mətn rəngi (vidjetdəki eyni qayda) */
const textFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "#111827" : "#ffffff";
};
const PAL = { light: { bg: "#ffffff", fg: "#111827" }, dark: { bg: "#1f2937", fg: "#f3f4f6" } };

/** Seçilmiş fayl 256px-ə qədər kiçildilir və PNG/WebP kimi yazılır: kiçik, sürətli, ölçü limitinə sığır. */
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  for (const [type, q] of [["image/png", undefined], ["image/webp", 0.9], ["image/webp", 0.7]] as const) {
    const url = c.toDataURL(type, q);
    const b64 = url.split(",")[1] ?? "";
    if (url.startsWith(`data:${type}`) && b64.length * 0.75 <= LOGO_MAX) return b64;
  }
  throw new Error("TOO_LARGE");
}

function MiniPanel({ palette, accent, title, logo }: { palette: { bg: string; fg: string }; accent: string; title: string; logo: string | null }) {
  const { t } = useI18n();
  const fg = palette.fg, bg = palette.bg;
  const mix = (pct: number) => `color-mix(in srgb, ${bg}, ${fg} ${pct}%)`;
  return (
    <div aria-hidden className="w-60 overflow-hidden rounded-xl text-xs shadow-md" style={{ background: bg, color: fg, border: `1px solid ${mix(14)}` }}>
      <div className="flex items-center gap-2 px-3 py-2.5 font-semibold" style={{ background: accent, color: textFor(accent) }}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-6 rounded-full object-cover" />
        )}
        <span className="truncate">{title || "Çat"}</span>
      </div>
      <div className="flex flex-col gap-2 p-3" style={{ background: mix(4) }}>
        <span className="self-start rounded-xl px-2.5 py-1.5" style={{ background: bg, border: `1px solid ${mix(14)}` }}>{t("Salam! Necə kömək edim?")}</span>
        <span className="self-end rounded-xl px-2.5 py-1.5" style={{ background: accent, color: textFor(accent) }}>{t("Çatdırılma neçə günə olur?")}</span>
      </div>
      <div className="flex gap-2 p-2" style={{ background: bg, borderTop: `1px solid ${mix(14)}` }}>
        <span className="flex-1 rounded-lg px-2 py-1.5" style={{ border: `1px solid ${mix(28)}`, color: `color-mix(in srgb, ${fg}, ${bg} 42%)` }}>{t("Mesajınızı yazın…")}</span>
        <span className="rounded-lg px-2.5 py-1.5 font-semibold" style={{ background: accent, color: textFor(accent) }}>{t("Göndər")}</span>
      </div>
    </div>
  );
}

export function DesignCard({ data, onChange }: { data: WidgetResponse; onChange: (d: WidgetResponse) => void }) {
  const { t } = useI18n();
  const w = data.widget;
  const [theme, setTheme] = useState<Theme>(w.theme ?? "light");
  const [bg, setBg] = useState(w.bg ?? "");
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgOk = bg === "" || HEX.test(bg);
  const dirty = (theme !== (w.theme ?? "light") || bg !== (w.bg ?? "")) && bgOk;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    try { onChange(await saveWidget({ theme, bg })); toast.success(t("Saxlandı. Dəyişiklik saytda səhifə yenilənəndə görünəcək.")); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function pick(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true);
    try {
      let b64: string;
      try { b64 = await shrink(file); } catch (err) { throw new Error((err as Error).message === "TOO_LARGE" ? t("Loqo çox böyükdür. Daha sadə və ya kiçik şəkil seç.") : t("Şəkil oxuna bilmədi. PNG, JPG və ya WebP seç.")); }
      onChange(await uploadWidgetLogo(b64));
      toast.success(t("Loqo yükləndi."));
    } catch (err) { toast.error((err as Error).message); }
    finally { setLogoBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function removeLogo() {
    setLogoBusy(true);
    try { onChange(await deleteWidgetLogo()); toast.success(t("Loqo silindi.")); } catch (err) { toast.error((err as Error).message); } finally { setLogoBusy(false); }
  }

  const custom = bg !== "" && HEX.test(bg);
  const previews = custom ? [{ bg, fg: textFor(bg) === "#ffffff" ? "#f3f4f6" : "#111827" }] : theme === "auto" ? [PAL.light, PAL.dark] : [theme === "dark" ? PAL.dark : PAL.light];

  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader><CardTitle>{t("Dizayn")}</CardTitle><CardDescription>{t("Çatın görünüşünü saytının üslubuna uyğunlaşdır: gecə/gündüz rejimi, fon rəngi və loqo.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>{t("Rejim")}</Label>
            <Segmented value={theme} onChange={setTheme} label={t("Rejim")} options={[{ value: "light", label: t("Gündüz") }, { value: "dark", label: t("Gecə") }, { value: "auto", label: t("Avtomatik") }]} />
            <p className="text-xs text-muted-foreground">{t("“Avtomatik” ziyarətçinin telefon və ya kompüterinin gecə/gündüz ayarına uyğun olur.")}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="bg">{t("Fon rəngi (ixtiyari)")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label={t("Fon rəngi seçici")} type="color" value={custom ? bg : "#ffffff"} onChange={(e) => setBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-card p-1" />
              <Input id="bg" maxLength={7} placeholder="#ffffff" value={bg} onChange={(e) => setBg(e.target.value.trim())} className="w-32 font-mono" aria-invalid={!bgOk} />
              {bg && <Button type="button" size="sm" variant="outline" onClick={() => setBg("")}>{t("Təmizlə")}</Button>}
            </div>
            <p className="text-xs text-muted-foreground">{custom ? t("Fon rəngi seçilib: rejim nəzərə alınmır, yazı rəngi avtomatik oxunaqlı seçilir.") : t("Boş olsa rejimin standart fonu işlənir.")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("Loqo")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              {w.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.logoUrl} alt={t("Cari loqo")} className="size-14 rounded-full border border-border object-cover" />
              ) : <span className="grid size-14 place-items-center rounded-full border border-dashed border-border text-muted-foreground"><ImagePlus size={20} aria-hidden /></span>}
              <Button type="button" size="sm" variant="outline" disabled={logoBusy} onClick={() => fileRef.current?.click()}>{logoBusy ? t("Gözlə…") : w.logoUrl ? t("Loqonu dəyiş") : t("Loqo yüklə")}</Button>
              {w.logoUrl && <Button type="button" size="sm" variant="ghost" disabled={logoBusy} onClick={removeLogo}><Trash2 size={14} aria-hidden />{t("Sil")}</Button>}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={t("Loqo yüklə")} onChange={(e) => void pick(e.target.files?.[0])} />
            </div>
            <p className="text-xs text-muted-foreground">{t("Çat başlığında və çat düyməsində göstərilir. Kvadrat və ya dairəvi şəkil yaxşı görünür. Şəkil avtomatik kiçildilir. Loqo dərhal saxlanır.")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("Necə görünəcək")}</Label>
            <div className="flex flex-wrap gap-4 rounded-lg bg-muted/60 p-4">
              {previews.map((p, i) => <MiniPanel key={i} palette={p} accent={w.color} title={w.title} logo={w.logoUrl ?? null} />)}
            </div>
            <p className="text-xs text-muted-foreground">{t("Rəng yuxarıdakı “Görünüş və davranış” kartındakı rəngdir.")}</p>
          </div>
        </CardContent>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button disabled={!dirty || busy}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </form>
    </Card>
  );
}
