"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resend, verify } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell, FormError, authLink } from "@/components/auth-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { OtpInput } from "@/components/otp-input";

const COOLDOWN = 60;

function VerifyForm() {
  const t = useT();
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(COOLDOWN);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await verify(email, code.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  // 6 rəqəm yazılan (və ya yapışdırılan) kimi avtomatik yoxlanılır
  async function submitCode(v: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { await verify(email, v); router.replace("/dashboard"); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  async function again() {
    setError("");
    await resend(email).catch(() => {});
    toast.success(t("Yeni kod göndərildi."));
    setWait(COOLDOWN);
  }

  if (!email) return (
    <AuthShell title={t("Email göstərilməyib")} subtitle={t("Qeydiyyatdan və ya giriş səhifəsindən yenidən başla.")}>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("Daxil ol")}</Link>
        <Link href="/register" className={buttonVariants({ className: "h-11" })}>{t("Hesab aç")}</Link>
      </div>
    </AuthShell>
  );
  return (
    <AuthShell title={t("Emailini təsdiqlə")} subtitle={t("{email} ünvanına 6 rəqəmli kod göndərdik. Kod 15 dəqiqə etibarlıdır.", { email })}
      footer={<>{t("Kod gəlmir? Spam qovluğuna bax.")} <Link href="/register" className={authLink}>{t("Email səhvdir?")}</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{t("Təsdiq kodu")}</Label>
          <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6 && v !== code && !busy) setTimeout(() => void submitCode(v), 0); }} autoFocus />
        </div>
        {error && <FormError>{error}</FormError>}
        <Button disabled={busy || code.length !== 6} className="h-11 w-full text-[15px]">{busy ? t("Yoxlanır…") : t("Təsdiqlə")}</Button>
        <Button type="button" variant="ghost" disabled={wait > 0} onClick={again}>{wait > 0 ? t("Kodu yenidən göndər ({n} san)", { n: wait }) : t("Kodu yenidən göndər")}</Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyForm /></Suspense>;
}
