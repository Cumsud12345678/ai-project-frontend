"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, getMe, login, loginTwoFactor } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell, FormError, authLink } from "@/components/auth-shell";
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
  // İki addımlı giriş: parol düzgündür, authenticator kodu gözlənilir
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");

  // Artıq daxil olubsa, formu göstərmə.
  useEffect(() => { getMe().then(() => router.replace("/dashboard")).catch(() => {}); }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await login(email, password);
      if ("ticket" in r) { setTicket(r.ticket); setPassword(""); setBusy(false); return; }
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") return router.push(`/verify?email=${encodeURIComponent(email)}`);
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginTwoFactor(email, ticket, code.trim());
      router.replace("/dashboard");
    } catch (err) {
      // Bilet vaxtı keçib və ya çox səhv cəhd: parol addımına qayıt
      if (err instanceof ApiError && (err.code === "TICKET_EXPIRED" || err.code === "TOO_MANY_ATTEMPTS")) { setTicket(""); setCode(""); }
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (ticket) return (
    <AuthShell title={t("İki addımlı giriş")} subtitle={t("Authenticator tətbiqindəki 6 rəqəmli kodu yaz.")}
      footer={<button type="button" className={`cursor-pointer ${authLink}`} onClick={() => { setTicket(""); setCode(""); setError(""); }}>{t("Başqa hesabla daxil ol")}</button>}>
      <form onSubmit={submitCode} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">{t("Kod")}</Label>
          <Input id="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="h-11 font-mono text-lg tracking-[0.3em]" value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9a-zA-Z-]/g, "").slice(0, 9))} />
          <p className="text-xs text-muted-foreground">{t("Telefon yanında deyilsə, ehtiyat kodlardan birini yaz (məs. abcd-efgh).")}</p>
        </div>
        {error && <FormError>{error}</FormError>}
        <Button disabled={busy || code.length < 6} className="h-11 w-full text-[15px]">{busy ? t("Yoxlanılır…") : t("Təsdiqlə")}</Button>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title={t("Daxil ol")} subtitle={t("Email və parolunla panelə daxil ol.")}
      footer={<>{t("Hesabın yoxdur?")} <Link href="/register" className={authLink}>{t("Hesab aç")}</Link></>}>
      {params.get("reset") && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CircleCheck size={16} aria-hidden className="shrink-0" />{t("Parol dəyişdirildi. Yeni parolla daxil ol.")}</p>}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between"><Label htmlFor="password">{t("Parol")}</Label><Link href="/forgot" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">{t("Parolu unutdun?")}</Link></div>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <FormError>{error}</FormError>}
        <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? t("Daxil olunur…") : t("Daxil ol")}</Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
