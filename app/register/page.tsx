"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { checkRefCode, register } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AuthShell, FormError, authLink } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput, PasswordStrength } from "@/components/password-input";

const REF_RE = /^[A-Za-z0-9_-]{3,20}$/;
// Tez-tez səhv yazılan e-poçt domenləri: kod səhv ünvana getməsin deyə düzəliş təklif olunur
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.ru": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "outlok.com": "outlook.com", "outlook.co": "outlook.com",
  "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yandex.r": "yandex.ru", "mail.r": "mail.ru", "iclod.com": "icloud.com", "icloud.co": "icloud.com",
};
function emailFix(email: string): string | null {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(email.trim().toLowerCase());
  const fix = m ? TYPOS[m[2]!] : undefined;
  return fix ? `${m![1]}@${fix}` : null;
}
/** Partnyor linkindən gələn kod (middleware kukiyə yazır) */
function linkCode(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("ref");
    if (q && REF_RE.test(q)) return q.toUpperCase();
    const m = /(?:^|;\s*)ref_code=([^;]+)/.exec(document.cookie);
    const c = m ? decodeURIComponent(m[1]!) : "";
    return REF_RE.test(c) ? c.toUpperCase() : "";
  } catch { return ""; }
}

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Promo kod: linkdən gəlibsə avtomatik yazılır; yoxdursa istifadəçi "Promo kodun var?" ilə açır
  const [fromLink, setFromLink] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [check, setCheck] = useState<{ code: string; valid: boolean; bonusPct: number; bonusCapAzn: number } | null>(null);

  useEffect(() => { const c = linkCode(); if (c) { setFromLink(c); setCode(c); setShowCode(true); } }, []);
  useEffect(() => {
    const c = code.trim().toUpperCase();
    if (!REF_RE.test(c)) { setCheck(null); return; }
    const id = setTimeout(() => { checkRefCode(c).then((r) => setCheck({ ...r, code: c })).catch(() => setCheck(null)); }, 350);
    return () => clearTimeout(id);
  }, [code]);

  const typed = code.trim().toUpperCase();
  const fix = emailFix(email);
  const source: "link" | "code" = typed && typed === fromLink ? "link" : "code";
  const codeBad = Boolean(typed) && (!REF_RE.test(typed) || (check?.code === typed && !check.valid));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (codeBad && source === "code") { setError(t("Promo kod tapılmadı")); return; }
    setBusy(true);
    setError("");
    try {
      await register(email, password, typed ? { code: typed, source } : undefined);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("Hesab aç")} subtitle={t("Pulsuz başla: kart lazım deyil, hər ay 2 AZN balans verilir. Emailinə təsdiq kodu göndəriləcək.")}
      footer={<>{t("Artıq hesabın var?")} <Link href="/login" className={authLink}>{t("Daxil ol")}</Link></>}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={fix ? "email-fix" : undefined} />
          {fix && <p id="email-fix" className="text-xs text-muted-foreground">{t("Bunu nəzərdə tuturdun:")} <button type="button" onClick={() => setEmail(fix)} className={`cursor-pointer ${authLink}`}>{fix}</button>?</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("Parol")}</Label>
          <PasswordInput id="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength value={password} />
        </div>
        {showCode ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ref">{t("Promo kod (istəyə bağlı)")}</Label>
            <Input id="ref" autoComplete="off" spellCheck={false} maxLength={20} className="h-11 font-mono uppercase tracking-wider" value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20))} aria-invalid={codeBad || undefined} aria-describedby="ref-hint" />
            <p id="ref-hint" className="min-h-5 text-xs" aria-live="polite">
              {check?.code === typed && check.valid
                ? <span className="flex items-center gap-1.5 text-emerald-700"><Gift size={13} aria-hidden />{check.bonusPct > 0 ? t("Kod qəbul olundu: ilk yükləmədə +{p}% bonus balans (ən çox {cap} AZN).", { p: check.bonusPct, cap: check.bonusCapAzn }) : t("Kod qəbul olundu.")}</span>
                : codeBad && source === "code" ? <span className="text-destructive">{t("Promo kod tapılmadı")}</span> : null}
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCode(true)} className={`-mt-2 cursor-pointer self-start text-sm ${authLink}`}>{t("Promo kodun var?")}</button>
        )}
        {error && <FormError>{error}</FormError>}
        <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? t("Göndərilir…") : t("Davam et")}</Button>
        {/* Razılıq: düyməni basmaqla şərtlər qəbul olunur (ödəniş sistemləri bu qeydi tələb edir) */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t("Davam etməklə {terms} və {privacy} qəbul edirsən.").split(/(\{terms\}|\{privacy\})/).map((part, i) =>
            part === "{terms}" ? <Link key={i} href="/legal/terms" target="_blank" className={authLink}>{t("İstifadə şərtlərini")}</Link>
              : part === "{privacy}" ? <Link key={i} href="/legal/privacy" target="_blank" className={authLink}>{t("Məxfilik siyasətini")}</Link>
                : part)}
        </p>
      </form>
    </AuthShell>
  );
}
