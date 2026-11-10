"use client";
import Link from "next/link";
import { hasSite } from "@/lib/site";
import { useRouter } from "next/navigation";
import { Bell, Building2, ChevronRight, Code, Hash, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { deleteMyAccount } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { PageHeader } from "@/components/page-header";
import { InfoRow } from "@/components/settings-ui";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  const router = useRouter();
  const { me, tenant } = useSession();
  const { t, day } = useI18n();
  // Ayarların qısa xəritəsi: menyuda axtarmadan lazım olana keçmək üçün
  const shortcuts = [
    { href: "/settings/notifications", icon: Bell, title: t("Bildirişlər"), note: t("Səs, brauzer və Telegram xəbərdarlıqları") },
    { href: "/settings/company", icon: Building2, title: t("Şirkət məlumatı"), note: t("Telefon, ünvan, iş saatları: köməkçi bunları deyir") },
    { href: "/settings/team", icon: Users, title: t("Komanda üzvləri"), note: t("Canlı söhbətə cavab verən operatorlar") },
    { href: "/settings/channels", icon: LayoutGrid, title: t("Bütün kanallar"), note: t("Sayt, Telegram, WhatsApp") },
    { href: "/settings/canned", icon: Hash, title: t("Hazır cavablar"), note: t("Operatorların bir kliklə göndərdiyi mətnlər") },
    { href: "/settings/security", icon: ShieldCheck, title: t("Giriş və təhlükəsizlik"), note: t("İki addımlı giriş, sessiyalar, bloklananlar") },
    { href: "/settings/api", icon: Code, title: t("API girişi"), note: t("Açar və backend-dən çağırış") },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("Hesab")} description={t("Daxil olduğun hesab və biznesin əsas məlumatı.")} />

      <Card>
        <CardHeader><CardTitle>{t("Hesab")}</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          <InfoRow label={t("E-poçt")}>{me.email}</InfoRow>
          <InfoRow label={t("İki addımlı giriş")}>
            <Link href="/settings/security" className="underline-offset-2 hover:underline">{me.twoFactor?.enabled ? t("Açıq") : t("Bağlı")}</Link>
          </InfoRow>
        </CardContent>
      </Card>

      {tenant && (
        <Card>
          <CardHeader><CardTitle>{t("Biznes")}</CardTitle><CardDescription>{t("Ad və domen qurulum zamanı təyin olunub, köməkçi özünü bu adla təqdim edir.")}</CardDescription></CardHeader>
          <CardContent className="divide-y divide-border">
            <InfoRow label={t("Ad")}>{tenant.businessName}</InfoRow>
            <InfoRow label={t("Domen")}>{hasSite(tenant.domain) ? tenant.domain : t("Sayt yoxdur: Telegram və WhatsApp")}</InfoRow>
            <InfoRow label={t("Yaradılıb")}>{day(tenant.createdAt)}</InfoRow>
          </CardContent>
        </Card>
      )}

      {tenant && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("Bütün ayarlar")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {shortcuts.map((s) => (
              <Link key={s.href} href={s.href} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/40">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><s.icon size={17} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{s.title}</span><span className="block truncate text-xs text-muted-foreground">{s.note}</span></span>
                <ChevronRight size={16} aria-hidden className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {me.role !== "admin" && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle>{t("Hesabı sil")}</CardTitle><CardDescription>{t("Hesabın, elan mənbəyi qoşulması, API açarı və çat vidjeti həmişəlik silinir. Geri qaytarmaq mümkün deyil. İstifadə olunmamış balans geri ödənilmir.")}</CardDescription></CardHeader>
          <CardContent>
            <DangerAction label="Hesabımı sil" confirm={{ kind: "password" }}
              warning={tenant ? t("{name} üçün API açarı və çat vidjeti dərhal işləməyi dayandıracaq. Saytına qoyduğun script xəta verəcək.", { name: tenant.businessName }) : t("Hesabın silinəcək.")}
              onConfirm={async (password) => { await deleteMyAccount(password); router.replace("/login"); }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
