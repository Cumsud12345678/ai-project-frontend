"use client";
import { useState } from "react";
import { toast } from "sonner";
import { saveProfile, type CompanyInfo } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { InfoRow, SettingsBody } from "@/components/settings-ui";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

// Sərhədlər ai-server-dəki COMPANY_FIELDS ilə eynidir
const FIELDS: { k: keyof CompanyInfo; label: string; max: number; ph: string; type?: string }[] = [
  { k: "phone", label: "Telefon", max: 40, ph: "+994 12 000 00 00", type: "tel" },
  { k: "whatsapp", label: "WhatsApp", max: 40, ph: "+994 50 000 00 00", type: "tel" },
  { k: "email", label: "E-poçt", max: 80, ph: "info@sirket.az", type: "email" },
  { k: "website", label: "Sayt", max: 120, ph: "https://sirket.az" },
  { k: "city", label: "Şəhər", max: 60, ph: "Bakı" },
  { k: "address", label: "Ünvan", max: 200, ph: "Nizami küç. 10" },
  { k: "hours", label: "İş saatları", max: 200, ph: "B.e.–Cümə 09:00–18:00, Şənbə 10:00–15:00" },
  { k: "instagram", label: "Instagram", max: 120, ph: "@sirket" },
  { k: "facebook", label: "Facebook", max: 120, ph: "facebook.com/sirket" },
];

function Company() {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const init = tenant?.config.profile?.company ?? {};
  const [base, setBase] = useState<CompanyInfo>(init);
  const [d, setD] = useState<CompanyInfo>(init);
  const [busy, setBusy] = useState(false);
  const clean = (c: CompanyInfo) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v)) as CompanyInfo;
  const dirty = JSON.stringify(clean(base)) !== JSON.stringify(clean(d));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    try {
      const c = clean(d);
      await saveProfile({ company: c });
      await refresh();
      setBase(c); setD(c);
      toast.success(t("Saxlandı. Köməkçi artıq bu məlumatı istifadə edir."));
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <SettingsBody>
      <PageHeader title={t("Şirkət məlumatı")} description={t("Müştəri telefon, ünvan və ya iş saatı soruşanda köməkçi yalnız buradakını deyir, özündən nömrə uydurmur.")} />

      <Card>
        <CardHeader><CardTitle>{t("Biznes")}</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <InfoRow label={t("Ad")}>{tenant?.businessName}</InfoRow>
          {tenant?.domain && <InfoRow label={t("Domen")}>{tenant.domain}</InfoRow>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Əlaqə və ünvan")}</CardTitle><CardDescription>{t("Boş qoyduğun sahə köməkçiyə ötürülmür.")}</CardDescription></CardHeader>
        <CardContent>
          <form id="company-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.k} className={f.k === "address" || f.k === "hours" ? "flex flex-col gap-1 sm:col-span-2" : "flex flex-col gap-1"}>
                <Label htmlFor={`co-${f.k}`}>{t(f.label)}</Label>
                <Input id={`co-${f.k}`} type={f.type ?? "text"} value={d[f.k] ?? ""} maxLength={f.max} placeholder={f.ph} onChange={(e) => setD({ ...d, [f.k]: e.target.value })} />
              </div>
            ))}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="co-about">{t("Şirkət haqqında")}</Label>
              <Textarea id="co-about" rows={4} value={d.about ?? ""} maxLength={600} onChange={(e) => setD({ ...d, about: e.target.value })}
                placeholder={t("məs. 2015-dən skuter və moped satırıq, rəsmi zəmanət veririk, Bakı daxili çatdırılma pulsuzdur.")} />
              <p className="text-right text-xs text-muted-foreground tabular-nums">{(d.about ?? "").length}/600</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!dirty || busy} onClick={() => setD(base)}>{t("Ləğv et")}</Button>
        <Button type="submit" form="company-form" disabled={!dirty || busy}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
      </div>
    </SettingsBody>
  );
}

export default function CompanyPage() {
  return <RequireTenant><Company /></RequireTenant>;
}
