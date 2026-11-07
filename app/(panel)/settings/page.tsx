"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { deleteMyAccount, rotateMyKey } from "@/lib/api";
import { ProfileCard } from "@/components/profile-card";
import { DangerAction } from "@/components/danger-action";
import { RotateKey } from "@/components/rotate-key";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/switch";
import { TeamCard } from "./team-card";
import { SessionsCard, TwoFactorCard } from "@/components/two-factor";

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
  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <p className="min-w-0 flex-1 text-muted-foreground">{t("Köməkçinin adı, dili, tonu, cavab uzunluğu və bacarıqları Köməkçi bölməsinə köçdü. Orada dəyişikliyi dərhal sınaq çatında yoxlaya bilərsən.")}</p>
          <Link href="/assistant/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("Köməkçinin profilinə keç")}</Link>
        </CardContent>
      </Card>
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

      <Section title={t("Təhlükəsizlik")} description={t("Girişi qoru və açıq qalan sessiyaları bağla.")}>
        <TwoFactorCard me={me} onChange={refresh} />
        <SessionsCard />
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

          <Section title={t("Komanda")} description={t("Canlı söhbətlərə cavab verəcək əlavə operatorlar.")}>
            <TeamCard />
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
