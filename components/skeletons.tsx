import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

/** Ekran oxuyucular üçün tək "Yüklənir" elanı; içindəki bloklar gizlidir. */
function Busy({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("Yüklənir…")}</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={i === rows - 1 ? "h-4 w-2/3" : "h-4 w-full"} />)}
      </CardContent>
    </Card>
  );
}

/** Forma: etiket + sahə cütləri. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Busy className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="flex flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>
          ))}
        </CardContent>
      </Card>
    </Busy>
  );
}

/** Cədvəl (elanlar). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Busy className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {[40, 16, 10, 14].map((w, i) => <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />)}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
          {[40, 16, 10, 14].map((w, j) => <Skeleton key={j} className="h-4" style={{ width: `${w}%` }} />)}
        </div>
      ))}
    </Busy>
  );
}

/** İstifadə (dashboard) səhifəsi. */
export function DashboardSkeleton() {
  return (
    <Busy className="flex flex-col gap-8">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-14 w-full" />
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
            {[0, 1, 2].map((i) => <div key={i} className="flex flex-col gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-16" /></div>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
        <CardContent>
          <div className="flex h-36 items-end gap-2">
            {[40, 65, 30, 80, 55, 45, 70, 35, 60, 50, 75, 40, 55, 65].map((h, i) => <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />)}
          </div>
        </CardContent>
      </Card>
    </Busy>
  );
}

/** Admin: istifadəçi kartları. */
export function UserListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Busy className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex justify-between gap-4"><div className="flex flex-col gap-2"><Skeleton className="h-5 w-52" /><Skeleton className="h-3 w-36" /></div><Skeleton className="h-6 w-16" /></div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-44" />
        </div>
      ))}
    </Busy>
  );
}

/** Giriş edildikdən sonra sessiya yüklənənədək: panelin və ya adminin ümumi görünüşü. */
export function AppSkeleton({ admin = false }: { admin?: boolean }) {
  if (admin) return (
    <Busy className="min-h-screen">
      <div className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div></div>
      <div className="mx-auto max-w-6xl px-5 py-8"><div className="flex flex-col gap-6"><PageHeaderSkeleton /><CardSkeleton /><CardSkeleton rows={2} /></div></div>
    </Busy>
  );
  // Panelin çərçivəsi (components/panel-shell.tsx) ilə eyni: ikon zolağı, yuxarı zolaq, ağ məzmun sahəsi
  return (
    <Busy className="flex h-dvh flex-col bg-shell">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <Skeleton className="hidden size-9 rounded-xl md:block md:mx-[21px]" /><Skeleton className="h-9 w-36 rounded-full" /><Skeleton className="hidden h-9 w-28 rounded-full sm:block" />
        <Skeleton className="ml-auto h-9 w-9 rounded-full md:mx-auto md:w-96" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[84px] shrink-0 flex-col items-center gap-5 pt-2 md:flex">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="size-10 rounded-xl" />)}</div>
        <div className="min-w-0 flex-1 bg-card md:mr-2 md:mb-2 md:rounded-2xl md:border md:border-border">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8"><div className="flex flex-col gap-6"><PageHeaderSkeleton /><CardSkeleton /><CardSkeleton rows={2} /></div></div>
        </div>
      </div>
    </Busy>
  );
}

/** Sorğular səhifəsi: xülasə kartları + siyahı. */
export function QueriesSkeleton() {
  return (
    <Busy className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-12" /></div>)}
      </div>
      <TableSkeleton rows={5} />
    </Busy>
  );
}
