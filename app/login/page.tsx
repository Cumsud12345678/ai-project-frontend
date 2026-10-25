"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
      {params.get("reset") && <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">{t("Parol dəyişdirildi. Yeni parolla daxil ol.")}</p>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} className="py-6 bg-[#f7faf8] rounded-xl text-[16px]" placeholder="example@gmail.com" onChange={(e) => setEmail(e.target.value)} />
        <Label htmlFor="password">{t("Parol")}</Label>
        <Input id="password" type="password" autoComplete="current-password" required value={password} className="py-6 bg-[#f7faf8] rounded-xl text-[16px]" placeholder="********" onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="p-6 rounded-xl text-md">{busy ? t("Daxil olunur…") : t("Daxil ol")}</Button>
        <Link href="/forgot" className="text-sm text-muted-foreground underline">{t("Parolu unutdun?")}</Link>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
