"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} className="py-6 bg-[#f7faf8] rounded-xl text-[16px]" placeholder="example@gmail.com" onChange={(e) => setEmail(e.target.value)} />
        <Label htmlFor="password">{t("Parol")}</Label>
        <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} className="py-6 bg-[#f7faf8] rounded-xl text-[16px]" onChange={(e) => setPassword(e.target.value)} aria-describedby="pw-hint" />
        <p id="pw-hint" className="text-xs text-muted-foreground">{t("Ən azı 8 simvol.")}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="p-6 rounded-xl text-md">{busy ? t("Göndərilir…") : t("Davam et")}</Button>
      </form>
    </AuthShell>
  );
}
