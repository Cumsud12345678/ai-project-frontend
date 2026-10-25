"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, getTenant, logout, type Me, type TenantInfo } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AppSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";

type Session = { me: Me; tenant: TenantInfo | null; advisorUrl: string; refresh: () => Promise<void>; signOut: () => Promise<void> };
const Ctx = createContext<Session | null>(null);

export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession yalnız SessionProvider daxilində işləyir");
  return s;
};

/** Giriş edilmiş istifadəçini və onun mənbəyini yükləyir; sessiya bitibsə giriş səhifəsinə yönləndirir. */
export function SessionProvider({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const router = useRouter();
  const t = useT();
  const [state, setState] = useState<{ me: Me; tenant: TenantInfo | null; advisorUrl: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [me, t] = await Promise.all([getMe(), getTenant()]);
      if (adminOnly && me.role !== "admin") return router.replace("/dashboard");
      setState({ me, tenant: t.tenant, advisorUrl: t.advisorUrl });
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await logout().catch(() => {}); // köhnə cookie təmizlənir
        return router.replace("/login");
      }
      setError((e as Error).message);
    }
  }, [router, adminOnly]);

  useEffect(() => { void load(); }, [load]);

  const signOut = useCallback(async () => {
    await logout().catch(() => {});
    router.replace("/login");
  }, [router]);

  if (error) return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-6">
      <p role="alert" className="text-sm text-destructive">{error}</p>
      <div><Button variant="outline" onClick={() => { setError(""); void load(); }}>{t("Yenidən yoxla")}</Button></div>
    </main>
  );
  if (!state) return <AppSkeleton admin={adminOnly} />;
  return <Ctx.Provider value={{ ...state, refresh: load, signOut }}>{children}</Ctx.Provider>;
}

/** Mənbə qoşulmayıbsa səhifənin əvəzinə yönləndirici göstərir. */
export function RequireTenant({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { tenant } = useSession();
  const router = useRouter();
  if (tenant) return <>{children}</>;
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">{t("Hələ qurulum tamamlanmayıb")}</h1>
      <p className="text-sm text-muted-foreground">{t("Elan mənbəyi qoş və ya sənədlərdən cavab verən dəstək botu qur.")}</p>
      <Button onClick={() => router.push("/setup")}>{t("Qurulumu başla")}</Button>
    </div>
  );
}
