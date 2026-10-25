"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMyAccount, rotateMyKey, saveProfile, type Profile } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { RotateKey } from "@/components/rotate-key";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

const PROFILE_DEFAULTS: Profile = { language: "az", tone: "dostcasına", maxResults: 5, extraInstructions: "", logQueries: true, generalKnowledge: true };

/** Hər mövzunun öz kartı və öz "Saxla" düyməsi var; yalnız həmin kartın sahələri göndərilir. */
function ProfileCard({ title, description, keys, children }: {
  title: string; description: string; keys: (keyof Profile)[];
  children: (draft: Profile, set: (patch: Profile) => void) => React.ReactNode;
}) {
  const { tenant, refresh } = useSession();
  const { t } = useI18n();
  const pick = (p: Profile) => Object.fromEntries(keys.map((k) => [k, p[k]])) as Profile;
  const start = () => pick({ ...PROFILE_DEFAULTS, ...(tenant?.config.profile ?? {}) });
  const [base, setBase] = useState<Profile>(start);
  const [draft, setDraft] = useState<Profile>(base);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [, setError] = useState("");
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || state === "busy") return;
    setState("busy");
    setError("");
    try {
      const body = { ...draft };
      if (keys.includes("maxResults")) body.maxResults = Math.min(10, Math.max(1, Math.round(Number(body.maxResults) || 5)));
      await saveProfile(body);
      await refresh();
      setBase(body);
      setDraft(body);
      setState("saved");
      toast.success(t("Saxlandı."));
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
      setState("idle");
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4" onChange={() => setState("idle")}>{children(draft, (patch) => { setState("idle"); setDraft((d) => ({ ...d, ...patch })); })}</CardContent>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button disabled={!dirty || state === "busy"}>{state === "busy" ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Solda mövzu başlığı, sağda kart(lar): səhifə mövzulara bölünür. */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border pt-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
      <div className="lg:sticky lg:top-6 lg:self-start"><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function BehaviorCards() {
  const { t } = useI18n();
  const { tenant } = useSession();
  const supportOnly = tenant?.config.profile?.mode === "support";
  return (
    <>
      <ProfileCard title={t("Dil və ton")} description={t("Məsləhətçinin hansı dildə və hansı üslubda cavab verəcəyi.")} keys={["language", "tone"]}>
        {(d, set) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1"><Label htmlFor="lang">{t("Məsləhətçinin cavab dili")}</Label>
              <select id="lang" value={d.language} onChange={(e) => set({ language: e.target.value })} className="h-9 rounded-md border border-border bg-card px-3 text-sm">
                <option value="az">{t("Azərbaycan dili")}</option><option value="ru">{t("Rus dili")}</option><option value="en">{t("İngilis dili")}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1"><Label htmlFor="tone">{t("Ton")}</Label><Input id="tone" maxLength={60} value={d.tone ?? ""} onChange={(e) => set({ tone: e.target.value })} /></div>
          </div>
        )}
      </ProfileCard>
      {!supportOnly && <ProfileCard title={t("Nəticə sayı")} description={t("Bir cavabda göstəriləcək elan, məhsul və ya xidmətlərin maksimum sayı.")} keys={["maxResults"]}>
        {(d, set) => (
          <div className="flex max-w-40 flex-col gap-1"><Label htmlFor="max">{t("Maksimum nəticə sayı")}</Label><Input id="max" type="number" min={1} max={10} value={d.maxResults ?? 5} onChange={(e) => set({ maxResults: Number(e.target.value) })} /></div>
        )}
      </ProfileCard>}
      <ProfileCard title={t("Əlavə təlimat")} description={t("Məsləhətçiyə öz sözlərinlə əlavə qayda yaz (məs. “endirimləri vurğula”, “qiymətləri AZN ilə göstər”, “mürəkkəb sualda operatora yönləndir”).")} keys={["extraInstructions"]}>
        {(d, set) => (
          <div className="flex flex-col gap-1"><Label htmlFor="extra" className="sr-only">{t("Əlavə təlimat")}</Label><Textarea id="extra" maxLength={1000} value={d.extraInstructions ?? ""} onChange={(e) => set({ extraInstructions: e.target.value })} /></div>
        )}
      </ProfileCard>
      <ProfileCard title={t("Ümumi məsləhət")} description={t("Köməkçi sənin elanlarından və sənədlərindən başqa, sahənlə bağlı ümumi suallara da cavab verə bilsin.")} keys={["generalKnowledge"]}>
        {(d, set) => (
          <SwitchRow checked={d.generalKnowledge !== false} onChange={(v) => set({ generalKnowledge: v })} on={t("Açıq")} off={t("Bağlı")}
            title={t("Ümumi suallara cavab ver")}
            description={t("Məs. “bu modelin ümumi üstünlükləri nədir”. Cavab “ümumi məlumatdır” qeydi ilə verilir, elanda və ya sənəddə olmayan konkret qiymət və şərt uydurulmur. Söndürsən, köməkçi yalnız öz məlumatlarından cavab verir.")} />
        )}
      </ProfileCard>
      <ProfileCard title={t("Sorğu jurnalı")} description={t("Sayt istifadəçilərinin suallarının “Sorğular” bölməsində saxlanması.")} keys={["logQueries"]}>
        {(d, set) => (
          <SwitchRow checked={d.logQueries !== false} onChange={(v) => set({ logQueries: v })} on={t("Açıq")} off={t("Bağlı")}
            title={t("Sayt istifadəçilərinin suallarını “Sorğular” bölməsində saxla")}
            description={t("Telefon və email avtomatik gizlədilir, qeydlər 90 gün sonra silinir. İstifadəçilərə bunun barədə saytında məlumat verməyi unutma.")} />
        )}
      </ProfileCard>
    </>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { me, tenant, advisorUrl, refresh } = useSession();
  const { t, day } = useI18n();
  const snippet = `curl -X POST ${advisorUrl}/v1/chat \\
  -H "Authorization: Bearer ca_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"${t("2000 AZN-ə qədər skuter")}"}'`;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{t("Ayarlar")}</h1>

      <Section title={t("Hesab")} description={t("Daxil olduğun hesab.")}>
        <Card><CardContent className="text-sm"><p>{me.email}</p></CardContent></Card>
      </Section>

      {!tenant ? (
        <p className="text-sm text-muted-foreground">{t("Açar və davranış ayarları elan mənbəyi qoşulandan sonra görünəcək.")}</p>
      ) : (
        <>
          <Section title={t("API açarı")} description={t("Saytının backend-i məsləhətçiyə bu açarla qoşulur.")}>
            <Card>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p className="text-muted-foreground">
                  {t("Açar aktivləşdirmə zamanı bir dəfə göstərilib, təhlükəsizlik üçün bir daha göstərilmir.")}{" "}
                  {tenant.keyRotatedAt ? t("Son yenilənmə: {date}.", { date: day(tenant.keyRotatedAt) }) : t("Yaradılıb: {date}.", { date: day(tenant.createdAt) })}
                </p>
                <p className="text-muted-foreground">{t("Açarı yalnız saytının backend-ində saxla, frontend koduna yazma. İtirsən və ya sızdırsan, yenisini yarat.")}</p>
                <RotateKey rotate={async () => { const r = await rotateMyKey(); await refresh(); toast.success(t("Yeni API açarı yaradıldı. Köhnə açar artıq işləmir.")); return r; }} warning={t("Köhnə açar dərhal işləməyi dayandıracaq. Saytının backend-ində açarı dəyişməsən, məsləhətçi işləməyəcək.")} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t("Backend-dən çağırış (API)")}</CardTitle><CardDescription>{t("Öz çat pəncərəni yazırsansa, sorğunu saytının backend-indən göndər. Hazır pəncərə üçün “Saytına qoş” bölməsinə bax.")}</CardDescription></CardHeader>
              <CardContent><pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{snippet}</pre></CardContent>
            </Card>
          </Section>

          <Section title={t("Məsləhətçinin davranışı")} description={t("İstifadəçilərə necə cavab verəcəyini müəyyən edir. Hər kartı ayrıca saxlayırsan.")}>
            <BehaviorCards />
          </Section>
        </>
      )}

      {me.role !== "admin" && (
        <Section title={t("Təhlükəli bölgə")} description={t("Geri qaytarıla bilməyən əməliyyatlar.")}>
          <Card className="border-destructive/40">
            <CardHeader><CardTitle>{t("Hesabı sil")}</CardTitle><CardDescription>{t("Hesabın, elan mənbəyi qoşulması, API açarı və çat vidjeti həmişəlik silinir. Geri qaytarmaq mümkün deyil.")}</CardDescription></CardHeader>
            <CardContent>
              <DangerAction label="Hesabımı sil" confirm={{ kind: "password" }}
                warning={tenant ? t("{name} üçün API açarı və çat vidjeti dərhal işləməyi dayandıracaq. Saytına qoyduğun script xəta verəcək.", { name: tenant.businessName }) : t("Hesabın silinəcək.")}
                onConfirm={async (password) => { await deleteMyAccount(password); router.replace("/login"); }} />
            </CardContent>
          </Card>
        </Section>
      )}
    </div>
  );
}
