"use client";
import { useRef, useState } from "react";
import { Bot, ImagePlus, MessageCircle, MoreHorizontal, Paperclip, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteWidgetImage, saveWidget, uploadWidgetImage, type WidgetImageKind, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switch";

type Theme = "light" | "dark" | "auto";
const LOGO_MAX = 100 * 1024;
// Vidjetdəki paletlə eyni (widget.js: PAL). Sahib yalnız əsas rəngi seçir, gecə/gündüz stili hazırdır.
const PAL = { light: { bg: "#ffffff", fg: "#111827" }, dark: { bg: "#1f2937", fg: "#f3f4f6" } };
const textFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "#111827" : "#ffffff";
};

/** Seçilmiş fayl 256px-ə qədər kiçildilir: kiçik, sürətli, ölçü limitinə sığır. */
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

/** Saytdakı vidjetin kiçik surəti: yazılar, rəng, loqo, profil şəkli və rejim dəyişəndə dərhal dəyişir. */
function Preview({ mode, setMode, accent, title, greeting, label, logo, avatar, side }: { mode: "light" | "dark"; setMode: (m: "light" | "dark") => void; accent: string; title: string; greeting: string; label: string; logo: string | null; avatar: string | null; side: "right" | "left" }) {
  const { t } = useI18n();
  const { bg, fg } = PAL[mode];
  const onAccent = textFor(accent);
  const mix = (pct: number) => `color-mix(in srgb, ${bg}, ${fg} ${pct}%)`;
  const muted = `color-mix(in srgb, ${fg}, ${bg} 42%)`;
  const av = (size: string, header: boolean) => (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full", size)} style={header ? { background: `color-mix(in srgb, ${onAccent} 18%, transparent)`, color: onAccent } : { background: accent, color: onAccent }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-full object-cover" />
      ) : <Bot size={header ? 15 : 12} />}
    </span>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Canlı önizləmə")}</span>
        <Segmented value={mode} onChange={setMode} label={t("Önizləmə rejimi")} options={[{ value: "light", label: t("Gündüz") }, { value: "dark", label: t("Gecə") }]} />
      </div>
      <div aria-hidden className="flex flex-col gap-3 rounded-xl bg-muted/70 p-4">
        <div className="overflow-hidden rounded-2xl text-xs shadow-lg" style={{ background: bg, color: fg, border: `1px solid ${mix(14)}` }}>
          <div className="flex items-center gap-2 px-3 py-2.5 font-semibold" style={{ background: accent, color: onAccent }}>
            {av("size-7", true)}
            <span className="min-w-0 flex-1 truncate text-[13px]">{title || t("Çat")}</span>
            <MoreHorizontal size={15} />
            <X size={15} />
          </div>
          <div className="flex min-h-40 flex-col gap-2 p-3" style={{ background: mix(4) }}>
            <span className="self-center text-[10px] font-semibold" style={{ color: muted }}>{t("18 Oktyabr")}</span>
            <div className="flex max-w-[92%] items-end gap-1.5 self-start">
              {av("size-5", false)}
              <span className="whitespace-pre-line rounded-xl px-2.5 py-1.5" style={{ background: bg, border: `1px solid ${mix(14)}` }}>{greeting || "…"}</span>
            </div>
            <div className="flex items-center gap-1.5 self-end">
              <span className="text-[10px]" style={{ color: muted }}>1:18</span>
              <span className="rounded-xl px-2.5 py-1.5" style={{ background: accent, color: onAccent }}>{t("Çatdırılma neçə günə olur?")}</span>
            </div>
          </div>
          <div className="p-2" style={{ background: bg, borderTop: `1px solid ${mix(14)}` }}>
            <div className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5" style={{ border: `1px solid ${mix(28)}`, color: muted }}>
              <span className="min-w-0 flex-1 truncate">{t("Mesajınızı yazın…")}</span>
              <Smile size={14} />
              <Paperclip size={14} />
            </div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2", side === "left" ? "flex-row" : "flex-row-reverse")}>
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full shadow-md" style={{ background: logo ? bg : accent, color: onAccent }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-full object-cover" />
            ) : <MessageCircle size={20} />}
          </span>
          {label && <span className="max-w-48 truncate rounded-full px-3.5 py-2 text-xs font-semibold shadow-md" style={{ background: bg, color: fg }}>{label}</span>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("Ziyarətçi çatdakı üç nöqtə menyusundan gecə və gündüz rejimini özü seçir, səsi də oradan bağlaya bilər.")}</p>
    </div>
  );
}

/** Bir şəkil (loqo və ya profil şəkli) üçün seçim: yalnız önbaxışda dəyişir, "Saxla" ilə göndərilir. */
function useImagePick(current: string | null | undefined) {
  const { t } = useI18n();
  // undefined = dəyişməyib, null = silinsin, string = yeni şəkil (base64)
  const [local, setLocal] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const shown = local !== undefined ? local : current ?? null;
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      let b64: string;
      try { b64 = await shrink(file); } catch (err) { throw new Error((err as Error).message === "TOO_LARGE" ? t("Loqo çox böyükdür. Daha sadə və ya kiçik şəkil seç.") : t("Şəkil oxuna bilmədi. PNG, JPG və ya WebP seç.")); }
      setLocal(`data:image/${b64.startsWith("iVBOR") ? "png" : "webp"};base64,${b64}`);
      setPending(b64);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  const remove = () => { setLocal(null); setPending(current ? null : undefined); };
  const reset = () => { setLocal(undefined); setPending(undefined); };
  return { shown, pending, busy, pick, remove, reset };
}
type ImagePick = ReturnType<typeof useImagePick>;

function ImageField({ img, kind, label, hint, fallback }: { img: ImagePick; kind: WidgetImageKind; label: string; hint: string; fallback: React.ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const isLogo = kind === "logo";
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {img.shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.shown} alt={isLogo ? t("Cari loqo") : t("Cari profil şəkli")} className="size-14 rounded-full border border-border object-cover" />
        ) : <span className="grid size-14 place-items-center rounded-full border border-dashed border-border text-muted-foreground">{fallback}</span>}
        <Button type="button" size="sm" variant="outline" disabled={img.busy} onClick={() => ref.current?.click()}>
          {img.busy ? t("Gözlə…") : img.shown ? (isLogo ? t("Loqonu dəyiş") : t("Profil şəklini dəyiş")) : (isLogo ? t("Loqo yüklə") : t("Profil şəkli yüklə"))}
        </Button>
        {img.shown && <Button type="button" size="sm" variant="ghost" disabled={img.busy} onClick={img.remove}><Trash2 size={14} aria-hidden />{t("Sil")}</Button>}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={isLogo ? t("Loqo yüklə") : t("Profil şəkli yüklə")}
          onChange={(e) => { void img.pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Görünüş və davranış: bütün çat ayarları bir kartda, sağda canlı önizləmə. Yalnız əsas rəngi seçirsən, gecə rejimi avtomatik hazırlanır. */
export function AppearanceCard({ data, onChange }: { data: WidgetResponse; onChange: (d: WidgetResponse) => void }) {
  const { t } = useI18n();
  const w = data.widget;
  const [enabled, setEnabled] = useState(w.enabled);
  const [liveOn, setLiveOn] = useState(Boolean(w.live?.enabled));
  const [title, setTitle] = useState(w.title);
  const [greeting, setGreeting] = useState(w.greeting);
  const [color, setColor] = useState(w.color);
  const [label, setLabel] = useState(w.label ?? "");
  const [theme, setTheme] = useState<Theme>(w.theme ?? "light");
  const [prev, setPrev] = useState<"light" | "dark">(w.theme === "dark" ? "dark" : "light");
  const [busy, setBusy] = useState(false);
  // Loqo (çat düyməsi) və profil şəkli (çatın içi) ayrıdır; seçiləndə yalnız önbaxışda dəyişir, "Saxla" ilə göndərilir
  const logo = useImagePick(w.logoUrl);
  const avatar = useImagePick(w.avatarUrl);

  const colorOk = /^#[0-9a-fA-F]{6}$/.test(color);
  const dirty = enabled !== w.enabled || liveOn !== Boolean(w.live?.enabled) || title !== w.title || greeting !== w.greeting || color !== w.color || label !== (w.label ?? "") || theme !== (w.theme ?? "light") || logo.pending !== undefined || avatar.pending !== undefined;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    if (!colorOk) { toast.error(t("Rəng #rrggbb formatında olmalıdır")); return; }
    setBusy(true);
    try {
      for (const [kind, img] of [["logo", logo], ["avatar", avatar]] as const) {
        if (img.pending === undefined) continue;
        if (img.pending === null) await deleteWidgetImage(kind); else await uploadWidgetImage(kind, img.pending);
      }
      onChange(await saveWidget({ enabled, title, greeting, color, label, theme, live: { enabled: liveOn } }));
      logo.reset(); avatar.reset();
      toast.success(t("Saxlandı. Dəyişiklik saytda səhifə yenilənəndə görünəcək.")); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  const changeTheme = (v: Theme) => { setTheme(v); if (v !== "auto") setPrev(v); };

  return (
    <Card>
      <form onSubmit={save}>
        <CardHeader><CardTitle>{t("Görünüş və davranış")}</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <SwitchRow className="sm:col-span-2" checked={enabled} onChange={setEnabled} on={t("Açıq")} off={t("Bağlı")}
              title={t("Vidjet aktivdir")} description={t("Söndürsən çat düyməsi saytında göstərilmir (skripti silmək lazım deyil).")} />
            <SwitchRow className="sm:col-span-2" checked={liveOn} onChange={setLiveOn} on={t("Açıq")} off={t("Bağlı")}
              title={t("Canlı operator söhbəti")} description={t("Ziyarətçi çatda “Operatorla canlı yaz” düyməsini görür, Telegram və WhatsApp müştəriləri isə /operator yazır; sən Müraciətlər bölməsindən real vaxtda cavab verirsən. Yalnız panelə baxa bildiyin vaxtlarda aç: operator cavab verməsə ziyarətçiyə əlaqə forması təklif olunur.")} />
            <div className="flex flex-col gap-1"><Label htmlFor="title">{t("Başlıq")}</Label><Input id="title" required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="color">{t("Rəng")}</Label>
              <div className="flex gap-2">
                <input aria-label={t("Rəng seçici")} type="color" value={colorOk ? color : "#ea580c"} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-card p-1" />
                <Input id="color" pattern="#[0-9a-fA-F]{6}" maxLength={7} value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" aria-invalid={!colorOk} />
              </div>
              <p className="text-xs text-muted-foreground">{t("Əsas rəng. Gecə rejimi bu rəngə uyğun avtomatik hazırlanır.")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="label">{t("Loqonun yanındakı yazı")}</Label>
              <Input id="label" maxLength={40} placeholder={t("məs. AI-dan soruş")} value={label} onChange={(e) => setLabel(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("Çat düyməsinin yanında göstərilir. Boş buraxsan, yazı göstərilməz.")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label>{t("Açılış rejimi")}</Label>
              <Segmented value={theme} onChange={changeTheme} label={t("Açılış rejimi")} options={[{ value: "light", label: t("Gündüz") }, { value: "dark", label: t("Gecə") }, { value: "auto", label: t("Avtomatik") }]} />
              <p className="text-xs text-muted-foreground">{t("Ziyarətçi çatı ilk açanda necə görünsün. “Avtomatik” onun cihaz ayarına uyğun olur. İstəsə düymə ilə dəyişir.")}</p>
            </div>
            <ImageField img={logo} kind="logo" label={t("Çat düyməsinin loqosu")} fallback={<MessageCircle size={20} aria-hidden />}
              hint={t("Saytında küncdəki çat düyməsində göstərilir. Yüklənməsə, standart çat ikonu çıxır.")} />
            <ImageField img={avatar} kind="avatar" label={t("Profil şəkli")} fallback={<Bot size={20} aria-hidden />}
              hint={t("Çat açılanda başlıqda və botun hər mesajının yanında dairə içində göstərilir. Yüklənməsə, robot ikonu çıxır.")} />
            <p className="text-xs text-muted-foreground sm:col-span-2"><ImagePlus size={13} className="mr-1 inline align-[-2px]" aria-hidden />{t("Kvadrat və ya dairəvi şəkil yaxşı görünür. Şəkil avtomatik kiçildilir və “Saxla” düyməsi ilə saxlanır.")}</p>
            <div className="flex flex-col gap-1 sm:col-span-2"><Label htmlFor="greeting">{t("Salamlama mesajı")}</Label><Textarea id="greeting" required maxLength={300} value={greeting} onChange={(e) => setGreeting(e.target.value)} /></div>
          </div>
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Preview mode={prev} setMode={setPrev} accent={colorOk ? color : "#ea580c"} title={title.trim()} greeting={greeting.trim()} label={label.trim()} logo={logo.shown} avatar={avatar.shown} side="right" />
          </div>
        </CardContent>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button disabled={!dirty || busy}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </form>
    </Card>
  );
}
