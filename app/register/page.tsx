"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput, PasswordStrength } from "@/components/password-input";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(email, password);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("Hesab aç")} subtitle={t("Emailinə təsdiq kodu göndəriləcək.")}
      footer={<>{t("Artıq hesabın var?")} <Link href="/login" className="text-primary underline">{t("Daxil ol")}</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("Parol")}</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength value={password} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? t("Göndərilir…") : t("Davam et")}</Button>
      </form>
    </AuthShell>
  );
}
