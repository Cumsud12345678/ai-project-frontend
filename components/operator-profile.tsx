"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { deleteOperatorProfile, getOperatorProfile, saveOperatorProfile, type OperatorProfileView } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const MAX = 100 * 1024;
/** Kvadrat kəsib 160px-ə kiçildir (profil şəkli dairədə göstərilir) */
async function squareShrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height), size = Math.min(160, side);
  const c = document.createElement("canvas");
  c.width = c.height = Math.max(1, size);
  c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
  for (const [type, q] of [["image/webp", 0.9], ["image/jpeg", 0.85], ["image/jpeg", 0.7]] as const) {
    const url = c.toDataURL(type, q);
    const b64 = url.split(",")[1] ?? "";
    if (url.startsWith(`data:${type}`) && b64.length * 0.75 <= MAX) return b64;
  }
  throw new Error("TOO_LARGE");
}

function Avatar({ src, size = 28 }: { src: string | null; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <UserRound size={Math.round(size * 0.55)} aria-hidden />}
    </span>
  );
}

/** Operatorun müştəriyə görünən adı və şəkli: canlı söhbətdə "Leyla söhbətə qoşuldu" və mesajların yanında görünür */
export function OperatorProfileButton() {
  const { t } = useI18n();
  const [view, setView] = useState<OperatorProfileView["profile"] | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // undefined = dəyişməyib, null = silinsin, string = yeni şəkil (base64)
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { getOperatorProfile().then((r) => setView(r.profile)).catch(() => setView(null)); }, []);
  if (view === undefined) return null;
  const shown = photo === undefined ? view?.photoUrl ?? null : photo ? `data:image/${photo.startsWith("/9j/") ? "jpeg" : "webp"};base64,${photo}` : null;

  function show() { setName(view?.name ?? ""); setPhoto(undefined); setOpen(true); }
  async function pick(f: File | undefined) {
    if (!f) return;
    try { setPhoto(await squareShrink(f)); }
    catch (e) { toast.error((e as Error).message === "TOO_LARGE" ? t("Şəkil çox böyükdür. Başqa şəkil seç.") : t("Şəkil oxuna bilmədi. PNG, JPG və ya WebP seç.")); }
    finally { if (file.current) file.current.value = ""; }
  }
  async function save() {
    setBusy(true);
    try { const r = await saveOperatorProfile({ name: name.trim(), ...(photo !== undefined && { photo }) }); setView(r.profile); setOpen(false); toast.success(t("Saxlandı.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await deleteOperatorProfile(); setView(null); setOpen(false); toast.success(t("Profil silindi.")); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={show} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-xs hover:bg-muted/50">
        <Avatar src={view?.photoUrl ?? null} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{view ? view.name : t("Müştəriyə görünən profilin yoxdur")}</span>
          <span className="block text-muted-foreground">{view ? t("Müştəri canlı söhbətdə bu adı görür") : t("Ad və şəkil əlavə et")}</span>
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} busy={busy} title={t("Müştəriyə görünən profilim")}
        description={t("Canlı söhbətdə qoşulanda müştəri “{name} söhbətə qoşuldu” yazısını, adını və şəklini görür. AI cavab verəndə isə “AI köməkçi” nişanı göstərilir.", { name: name.trim() || "Leyla" })}
        footer={<>
          {view && <Button variant="ghost" onClick={remove} disabled={busy} className="mr-auto text-destructive"><Trash2 size={14} aria-hidden />{t("Profili sil")}</Button>}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>{t("Ləğv et")}</Button>
          <Button onClick={save} disabled={busy || !name.trim()}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        </>}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="op-name">{t("Görünən ad")}</Label>
            <Input id="op-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t("məs. Leyla")} />
            <p className="text-xs text-muted-foreground">{t("Yalnız ad yaz (e-poçt və ya link olmaz). Profil yoxdursa müştəri sadəcə “Operator” görür.")}</p>
            <p className="text-xs text-muted-foreground">{t("Telegram və WhatsApp-da göndərdiyin mesajların əvvəlinə adın yazılır, məs. “Leyla: Salam”.")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Avatar src={shown} size={56} />
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            <Button variant="outline" size="sm" onClick={() => file.current?.click()} disabled={busy}><ImagePlus size={14} aria-hidden />{shown ? t("Şəkli dəyiş") : t("Şəkil əlavə et")}</Button>
            {shown && <Button variant="ghost" size="sm" onClick={() => setPhoto(null)} disabled={busy}>{t("Şəkli sil")}</Button>}
          </div>
        </div>
      </Modal>
    </>
  );
}
