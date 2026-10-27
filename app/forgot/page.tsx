"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgot, resetPassword } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { OtpInput } from "@/components/otp-input";
import { PasswordInput, PasswordStrength } from "@/components/password-input";

export default function ForgotPage() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (step === "email") return (
    <AuthShell title={t("Parolu sıfırla")} subtitle={t("Emailini yaz, sənə kod göndərək.")}
      footer={<Link href="/login" className="text-primary underline">{t("Girişə qayıt")}</Link>}>
      <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await forgot(email); setStep("code"); }); }} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? t("Göndərilir…") : t("Kod göndər")}</Button>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title={t("Yeni parol təyin et")} subtitle={t("Bu email üçün hesab varsa, {email} ünvanına kod göndərildi.", { email })}>
      <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await resetPassword(email, code, password); router.push("/login?reset=1"); }); }} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2"><Label htmlFor="code">{t("Kod")}</Label><OtpInput value={code} onChange={setCode} autoFocus /></div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("Yeni parol")}</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength value={password} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button disabled={busy || code.length !== 6} className="h-11 w-full text-[15px]">{busy ? t("Yoxlanır…") : t("Parolu dəyiş")}</Button>
      </form>
    </AuthShell>
  );
}
