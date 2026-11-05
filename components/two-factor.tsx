"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { revokeOtherSessions, twoFactorBackupCodes, twoFactorDisable, twoFactorEnable, twoFactorSetup, type Me } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const codeInput = (v: string) => v.replace(/[^0-9a-zA-Z-]/g, "").slice(0, 9);

/** Bir dəfəlik göstərilən ehtiyat kodlar: kopyalamaq və ya yükləmək. */
function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const t = useT();
  const text = codes.join("\n");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{t("Ehtiyat kodları təhlükəsiz yerdə saxla. Telefon itəndə hər biri ilə bir dəfə daxil ola bilərsən. Bu kodlar bir daha göstərilməyəcək.")}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => <li key={c} className="tabular-nums">{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success(t("Kopyalandı.")); } catch { toast.error(t("Kopyalamaq alınmadı")); } }}><Copy size={14} aria-hidden />{t("Kopyala")}</Button>
        <a className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted" download="ehtiyat-kodlar.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>{t("Fayl kimi yüklə")}</a>
        <Button size="sm" type="button" onClick={onDone}>{t("Saxladım")}</Button>
      </div>
    </div>
  );
}

/**
 * İki addımlı giriş (TOTP): quraşdırma (parol → QR → kod → ehtiyat kodlar), ehtiyat kodları yeniləmə, söndürmə.
 * Admin üçün məcburidirsə söndürmə düyməsi göstərilmir.
 */
export function TwoFactorCard({ me, onChange }: { me: Me; onChange: () => void | Promise<void> }) {
  const t = useT();
  const tf = me.twoFactor ?? { enabled: false, required: false, setupNeeded: false, backupLeft: 0 };
  const [step, setStep] = useState<"idle" | "password" | "scan" | "codes" | "disable" | "regen">("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep("idle"); setPassword(""); setCode(""); setSetup(null); setError(""); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {tf.enabled ? <ShieldCheck size={17} className="text-chart-2" aria-hidden /> : <ShieldOff size={17} className="text-muted-foreground" aria-hidden />}
          {t("İki addımlı giriş (2FA)")}
        </CardTitle>
        <CardDescription>
          {tf.enabled
            ? t("Aktivdir. Girişdə parolla yanaşı telefondakı authenticator tətbiqinin kodu soruşulur. Qalan ehtiyat kod: {n}.", { n: tf.backupLeft })
            : t("Parolla yanaşı Google Authenticator, Authy və ya 1Password kimi tətbiqdən 6 rəqəmli kod soruşulur. Parol oğurlansa belə hesaba girmək olmur.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "codes" && <BackupCodes codes={codes} onDone={() => { setCodes([]); reset(); void onChange(); }} />}

        {!tf.enabled && step === "idle" && <div><Button onClick={() => setStep("password")}>{t("Quraşdır")}</Button></div>}

        {step === "password" && (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await twoFactorSetup(password); setSetup({ secret: r.secret, qr: r.qr }); setPassword(""); setStep("scan"); }); }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tf-pass">{t("Davam etmək üçün parolunu yaz")}</Label>
              <PasswordInput id="tf-pass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-2"><Button disabled={busy || !password}>{t("Davam et")}</Button><Button type="button" variant="outline" onClick={reset}>{t("İmtina")}</Button></div>
          </form>
        )}

        {step === "scan" && setup && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await twoFactorEnable(code.trim()); setCodes(r.backupCodes); setCode(""); setStep("codes"); toast.success(t("İki addımlı giriş aktivdir.")); }); }}>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              <li>{t("Telefonunda authenticator tətbiqini aç və QR kodu skan et.")}</li>
              <li>{t("Tətbiqdə görünən 6 rəqəmli kodu aşağıya yaz.")}</li>
            </ol>
            <div className="flex flex-wrap items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt={t("2FA üçün QR kod")} width={180} height={180} className="rounded-lg border border-border bg-white p-1" />
              <div className="flex min-w-0 flex-col gap-1 text-sm">
                <span className="text-muted-foreground">{t("Skan edə bilmirsənsə, açarı əl ilə yaz:")}</span>
                <code className="break-all rounded-md bg-muted px-2 py-1 font-mono text-xs">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tf-code">{t("Kod")}</Label>
              <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" className="w-40 font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
            </div>
            <div className="flex gap-2"><Button disabled={busy || code.length !== 6}>{t("Aktivləşdir")}</Button><Button type="button" variant="outline" onClick={reset}>{t("İmtina")}</Button></div>
          </form>
        )}

        {tf.enabled && step === "idle" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("regen")}>{t("Yeni ehtiyat kodlar")}</Button>
            {!tf.required && <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setStep("disable")}>{t("Söndür")}</Button>}
          </div>
        )}

        {step === "regen" && (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await twoFactorBackupCodes(code.trim()); setCodes(r.backupCodes); setCode(""); setStep("codes"); }); }}>
            <p className="text-sm text-muted-foreground">{t("Köhnə ehtiyat kodlar işləməyəcək.")}</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tf-regen">{t("Authenticator kodu")}</Label>
              <Input id="tf-regen" inputMode="numeric" autoComplete="one-time-code" className="w-40 font-mono tracking-widest" value={code} onChange={(e) => setCode(codeInput(e.target.value))} autoFocus />
            </div>
            <div className="flex gap-2"><Button disabled={busy || code.length < 6}>{t("Yarat")}</Button><Button type="button" variant="outline" onClick={reset}>{t("İmtina")}</Button></div>
          </form>
        )}

        {step === "disable" && (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await twoFactorDisable(password, code.trim()); toast.success(t("İki addımlı giriş söndürüldü.")); reset(); await onChange(); }); }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tf-dpass">{t("Parol")}</Label>
              <PasswordInput id="tf-dpass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tf-dcode">{t("Authenticator kodu və ya ehtiyat kod")}</Label>
              <Input id="tf-dcode" autoComplete="one-time-code" className="w-48 font-mono tracking-widest" value={code} onChange={(e) => setCode(codeInput(e.target.value))} />
            </div>
            <div className="flex gap-2"><Button variant="destructive" disabled={busy || !password || code.length < 6}>{t("Söndür")}</Button><Button type="button" variant="outline" onClick={reset}>{t("İmtina")}</Button></div>
          </form>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

/** Bu cihazdan başqa bütün cihazlardakı sessiyaları bağlayır. */
export function SessionsCard() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Aktiv sessiyalar")}</CardTitle>
        <CardDescription>{t("Başqa kompüter və ya telefonda açıq qalan girişləri bağla. Bu cihazda daxil olmuş qalırsan.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await revokeOtherSessions(); toast.success(t("Digər cihazlardan çıxış edildi.")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }}>
          <LogOut size={15} aria-hidden />{t("Digər cihazlardan çıx")}
        </Button>
      </CardContent>
    </Card>
  );
}
