"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgot, resetPassword } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
      <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await forgot(email); setStep("code"); }); }} className="flex flex-col gap-3">
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy}>{t("Kod göndər")}</Button>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title={t("Yeni parol təyin et")} subtitle={t("Bu email üçün hesab varsa, {email} ünvanına kod göndərildi.", { email })}>
      <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await resetPassword(email, code, password); router.push("/login?reset=1"); }); }} className="flex flex-col gap-3">
        <Label htmlFor="code">{t("Kod")}</Label>
        <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="font-mono text-lg tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        <Label htmlFor="password">{t("Yeni parol")}</Label>
        <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy || code.length !== 6}>{t("Parolu dəyiş")}</Button>
      </form>
    </AuthShell>
  );
}
