"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Artıq daxil olubsa, formu göstərmə.
  useEffect(() => { getMe().then(() => router.replace("/dashboard")).catch(() => {}); }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") return router.push(`/verify?email=${encodeURIComponent(email)}`);
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("Daxil ol")} subtitle={t("Email və parolunla panelə daxil ol.")}
      footer={<>{t("Hesabın yoxdur?")} <Link href="/register" className="text-primary underline">{t("Hesab aç")}</Link></>}>
      {params.get("reset") && <p role="status" className="rounded-lg border border-chart-2/30 bg-chart-2/10 px-3 py-2 text-sm">{t("Parol dəyişdirildi. Yeni parolla daxil ol.")}</p>}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between"><Label htmlFor="password">{t("Parol")}</Label><Link href="/forgot" className="text-sm text-primary hover:underline">{t("Parolu unutdun?")}</Link></div>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? t("Daxil olunur…") : t("Daxil ol")}</Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
