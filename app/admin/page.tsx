"use client";
import { AdminUsage } from "@/components/admin-usage";
import { useT } from "@/lib/i18n";

export default function AdminOverviewPage() {
  const t = useT();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Ümumi baxış")}</h1>
        <p className="text-sm text-muted-foreground">{t("Bütün müştərilərin token və sorğu istifadəsi.")}</p>
      </header>
      <AdminUsage />
    </div>
  );
}
