"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resend, verify } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  async function again() {
    setError("");
    await resend(email).catch(() => {});
    toast.success(t("Yeni kod göndərildi."));
    setWait(COOLDOWN);
  }

  if (!email) return <AuthShell title={t("Email göstərilməyib")} subtitle={t("Qeydiyyatdan və ya giriş səhifəsindən yenidən başla.")} />;
  return (
    <AuthShell title={t("Emailini təsdiqlə")} subtitle={t("{email} ünvanına 6 rəqəmli kod göndərdik. Kod 15 dəqiqə etibarlıdır.", { email })}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{t("Təsdiq kodu")}</Label>
          <OtpInput value={code} onChange={setCode} autoFocus />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button disabled={busy || code.length !== 6} className="h-11 w-full text-[15px]">{busy ? t("Yoxlanır…") : t("Təsdiqlə")}</Button>
        <Button type="button" variant="ghost" disabled={wait > 0} onClick={again}>{wait > 0 ? t("Kodu yenidən göndər ({n} san)", { n: wait }) : t("Kodu yenidən göndər")}</Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyForm /></Suspense>;
}
