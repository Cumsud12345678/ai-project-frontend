"use client";
// Ayarlar səhifələrinin ortaq hissələri.

/** Oxunan sətir: solda ad, sağda dəyər */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all font-medium">{children}</span>
    </div>
  );
}

/** Ayarlar səhifəsinin gövdəsi: oxunaqlı en */
export function SettingsBody({ children }: { children: React.ReactNode }) {
  return <div className="flex max-w-3xl flex-col gap-6">{children}</div>;
}
