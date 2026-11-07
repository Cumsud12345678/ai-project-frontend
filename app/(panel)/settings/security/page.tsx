"use client";
import Link from "next/link";
import { Ban, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProfileCard } from "@/components/profile-card";
import { SettingsBody } from "@/components/settings-ui";
import { SessionsCard, TwoFactorCard } from "@/components/two-factor";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { SwitchRow } from "@/components/ui/switch";

export default function SecurityPage() {
  const { t } = useI18n();
  const { me, tenant, refresh } = useSession();
  return (
    <SettingsBody>
      <PageHeader title={t("Giriş və təhlükəsizlik")} description={t("Girişi qoru və açıq qalan sessiyaları bağla.")} />
      <TwoFactorCard me={me} onChange={refresh} />
      <SessionsCard />
      {tenant && (
        <>
          <ProfileCard title={t("Sorğu jurnalı")} description={t("Sayt istifadəçilərinin suallarının “Sorğular” bölməsində saxlanması.")} keys={["logQueries"]}>
            {(d, set) => (
              <SwitchRow checked={d.logQueries !== false} onChange={(v) => set({ logQueries: v })} on={t("Açıq")} off={t("Bağlı")}
                title={t("Sayt istifadəçilərinin suallarını “Sorğular” bölməsində saxla")}
                description={t("Telefon və email avtomatik gizlədilir, qeydlər 90 gün sonra silinir. İstifadəçilərə bunun barədə saytında məlumat verməyi unutma.")} />
            )}
          </ProfileCard>
          <Link href="/customers?f=blocked" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-foreground/40">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><Ban size={17} aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{t("Bloklanmış müştərilər")}</span><span className="block text-xs text-muted-foreground">{t("Spam yazanlar və bloklanan ziyarətçilər; blokdan Müştərilər bölməsində çıxarılır.")}</span></span>
            <ChevronRight size={16} aria-hidden className="text-muted-foreground" />
          </Link>
        </>
      )}
    </SettingsBody>
  );
}
