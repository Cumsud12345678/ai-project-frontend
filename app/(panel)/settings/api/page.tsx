"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { rotateMyKey } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { RotateKey } from "@/components/rotate-key";
import { InfoRow, SettingsBody } from "@/components/settings-ui";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Api() {
  const { t, day } = useI18n();
  const { tenant, advisorUrl, refresh } = useSession();
  const [copied, setCopied] = useState(false);
  const snippet = `curl -X POST ${advisorUrl}/v1/chat \\
  -H "Authorization: Bearer ca_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"${t("2000 AZN-ə qədər skuter")}"}'`;
  if (!tenant) return null;
  return (
    <SettingsBody>
      <PageHeader title={t("API girişi")} description={t("Saytının backend-i məsləhətçiyə bu açarla qoşulur.")} />
      <Card>
        <CardHeader><CardTitle>{t("API açarı")}</CardTitle><CardDescription>{t("Açarı yalnız saytının backend-ində saxla, frontend koduna yazma. İtirsən və ya sızdırsan, yenisini yarat.")}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="divide-y divide-border">
            <InfoRow label={t("Açar")}><span className="font-mono">ca_live_••••••••</span></InfoRow>
            <InfoRow label={tenant.keyRotatedAt ? t("Son yenilənmə") : t("Yaradılıb")}>{day(tenant.keyRotatedAt ?? tenant.createdAt)}</InfoRow>
          </div>
          <p className="text-muted-foreground">{t("Açar aktivləşdirmə zamanı bir dəfə göstərilib, təhlükəsizlik üçün bir daha göstərilmir.")}</p>
          <RotateKey rotate={async () => { const r = await rotateMyKey(); await refresh(); toast.success(t("Yeni API açarı yaradıldı. Köhnə açar artıq işləmir.")); return r; }} warning={t("Köhnə açar dərhal işləməyi dayandıracaq. Saytının backend-ində açarı dəyişməsən, məsləhətçi işləməyəcək.")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div><CardTitle>{t("Backend-dən çağırış (API)")}</CardTitle><CardDescription>{t("Öz çat pəncərəni yazırsansa, sorğunu saytının backend-indən göndər. Hazır pəncərə üçün “Saytına qoş” bölməsinə bax.")}</CardDescription></div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => { void navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? t("Kopyalandı") : t("Kopyala")}
          </Button>
        </CardHeader>
        <CardContent><pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{snippet}</pre></CardContent>
      </Card>
    </SettingsBody>
  );
}

export default function ApiPage() {
  return <RequireTenant><Api /></RequireTenant>;
}
