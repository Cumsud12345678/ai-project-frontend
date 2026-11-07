"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPrivateData, newIdentitySecret, type PrivateData } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { KeyReveal } from "@/components/key-reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Saytın serverində istifadəçi tokenini imzalamaq üçün kod (sayt sahibinin proqramçısı öz backend-inə qoyur)
const NODE = `import crypto from "node:crypto";
const b64u = (b) => Buffer.from(b).toString("base64url");
export function carAdvisorToken(userId, secret = process.env.CAR_ADVISOR_SECRET) {
  const p = b64u(JSON.stringify({ sub: String(userId), exp: Math.floor(Date.now() / 1000) + 900 }));
  return \`v1.\${p}.\${crypto.createHmac("sha256", secret).update(\`v1.\${p}\`).digest("base64url")}\`;
}`;
const PHP = `function carAdvisorToken($userId, $secret) {
  $b64u = fn($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
  $p = $b64u(json_encode(['sub' => (string)$userId, 'exp' => time() + 900]));
  return "v1.$p." . $b64u(hash_hmac('sha256', "v1.$p", $secret, true));
}`;
const PY = `import base64, hashlib, hmac, json, time
def car_advisor_token(user_id, secret):
    b64u = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    p = b64u(json.dumps({"sub": str(user_id), "exp": int(time.time()) + 900}).encode())
    return f"v1.{p}." + b64u(hmac.new(secret.encode(), f"v1.{p}".encode(), hashlib.sha256).digest())`;
const PAGE_JS = `<script>
  // Daxil olmuş istifadəçi üçün: tokeni SERVER yaradır (gizli açar brauzerə düşməməlidir)
  function caIdentify(token) {
    var go = function () { window.CarAdvisor && window.CarAdvisor.identify(token); };
    window.CarAdvisor ? go() : window.addEventListener("load", go);
  }
  caIdentify("TOKEN_SERVERDƏN"); // istifadəçi çıxanda: caIdentify(null)
  // Token bitəndə (15 dəq) yenisini al:
  window.addEventListener("caradvisor:identity-expired", function () {
    fetch("/api/car-advisor-token").then(function (r) { return r.text(); }).then(caIdentify);
  });
</script>`;

function Code({ code }: { code: string }) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed"><code>{code}</code></pre>
      <Button type="button" size="sm" variant="outline" className="absolute right-2 top-2" onClick={() => { navigator.clipboard?.writeText(code).then(() => toast.success(t("Kopyalandı")), () => toast.error(t("Kopyalanmadı. Açarı əl ilə seçib kopyala."))); }}>{t("Kopyala")}</Button>
    </div>
  );
}


/**
 * Daxil olmuş istifadəçinin tanınması: gizli açar (cais_...) və saytda token yaratma kodu.
 * Həm "Müştəri məlumatı" (öz sifarişlərini görmək), həm də girişli "Əməliyyatlar" (sifarişi ləğv et) bu açardan istifadə edir.
 * Məlumat mənbəyi qoşulmadan da yaradılır.
 */
export function IdentitySetup({ step = "", onChanged }: { step?: string; onChanged?: () => void }) {
  const { t, short } = useI18n();
  const [identity, setIdentity] = useState<PrivateData["identity"] | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [lang, setLang] = useState<"node" | "php" | "py">("node");
  const load = useCallback(() => getPrivateData().then((d) => setIdentity(d.identity)).catch((e: Error) => toast.error(e.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function make() {
    try { setRevealed((await newIdentitySecret()).identitySecret); await load(); onChanged?.(); }
    catch (err) { toast.error((err as Error).message); }
  }
  if (!identity) return null;
  const codes = { node: NODE, php: PHP, py: PY };

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">{step}{t("Gizli açar: istifadəçini tanımaq üçün")}</CardTitle>
          <CardDescription>{identity.configured ? t("Yaradılıb: {d}. Yeni açar yaratsan köhnəsi dərhal işləməyi dayandırır.", { d: identity.createdAt ? short(identity.createdAt) : "" }) : t("Hələ yaradılmayıb.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("Saytın serveri bu açarla “bu istifadəçi Aysel-dir” deyən imzalı token yaradır. Bir açar həm müştəri məlumatı, həm də daxil olmuş istifadəçinin əməliyyatları üçündür.")}</p>
          {revealed && <KeyReveal apiKey={revealed} title={t("Yeni gizli açar")} onDone={() => setRevealed(null)} />}
          {!revealed && (identity.configured
            ? <DangerAction label="Yeni açar yarat" confirm={{ kind: "text", expected: t("yarat"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("yarat") }) }} warning={t("Köhnə açar dərhal etibarsız olur, saytındakı token kodunu yeni açarla yeniləməsən istifadəçilər öz məlumatlarını görə bilməyəcək.")} onConfirm={make} />
            : <Button type="button" className="self-start" onClick={make}>{t("Gizli açar yarat")}</Button>)}
        </CardContent>
      </Card>

      {identity.configured && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Saytında token ver")}</CardTitle><CardDescription>{t("Bu kodu saytının proqramçısı öz serverinə qoyur: istifadəçi daxil olanda token yaradır və səhifəyə verir. Gizli açarı heç vaxt brauzerə vermə.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-1 text-sm" role="tablist">
              {(["node", "php", "py"] as const).map((k) => <button key={k} role="tab" type="button" aria-selected={lang === k} onClick={() => setLang(k)} className={`rounded px-3 py-1.5 ${lang === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{k === "node" ? "Node.js" : k === "php" ? "PHP" : "Python"}</button>)}
            </div>
            <Code code={codes[lang]} />
            <p className="text-sm text-muted-foreground">{t("Səhifədə vidjet skriptindən sonra tokeni vidjetə ver. İstifadəçi çıxanda null göndər: söhbət və şəxsi cavablar brauzerdən silinir.")}</p>
            <Code code={PAGE_JS} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
