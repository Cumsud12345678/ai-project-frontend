"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getLiveCount, getOverview, pingOverview, type Overview } from "@/lib/api";
import { AnnouncementBanner, SuspendedBanner } from "@/components/announcement-banner";
import { PanelFrame } from "@/components/panel-shell";
import { SessionProvider, useSession } from "@/components/session";
import { useT } from "@/lib/i18n";
import { useLiveEvents } from "@/lib/live-socket";
import { alertLive, alertVisitor } from "@/lib/live-alerts";

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenant, isOperator } = useSession();
  const router = useRouter();
  const t = useT();
  const [waiting, setWaiting] = useState(0);
  const [liveOn, setLiveOn] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const refreshWaiting = useRef<() => void>(() => {});
  const lastOverview = useRef(0);
  // Operator (komanda üzvü) yalnız canlı söhbət qutusuna girə bilər
  useEffect(() => { if (isOperator && !pathname.startsWith("/inbox")) router.replace("/inbox"); }, [isOperator, pathname, router]);
  // Cavab gözləyən canlı söhbətlər menyuda qırmızı sayğacla görünür
  useEffect(() => {
    if (!tenant) return;
    let on = true;
    const f = () => getLiveCount().then((r) => { if (on) { setLiveOn(r.enabled); setWaiting(r.enabled ? r.waiting : 0); } }).catch(() => {});
    f();
    const i = setInterval(f, 20000);
    refreshWaiting.current = f;
    return () => { on = false; clearInterval(i); };
  }, [tenant]);
  // Canlı söhbət açıqdırsa: yeni mesaj siqnalı ilə sayğac dərhal yenilənir
  // Ziyarətçi yazanda: qısa səs, tab gizlidirsə brauzer bildirişi və başlıqda sayğac (lib/live-alerts.ts)
  useLiveEvents((e) => {
    if (e.t === "leads") {
      if (isOperator) return;
      pingOverview();
      if (!pathname.startsWith(e.kind === "booking" ? "/bookings" : "/orders")) toast.success(e.kind === "booking" ? t("Yeni randevu gəldi") : t("Yeni sifariş gəldi"), { action: { label: t("Bax"), onClick: () => router.push(e.kind === "booking" ? "/bookings" : "/orders") } });
      return;
    }
    if (!liveOn) return;
    if (e.t === "visitors") { if (!isOperator) alertVisitor(e, { visitor: t("Sayta yeni ziyarətçi girdi"), returning: t("Qayıdan ziyarətçi saytdadır"), body: t("Kimin saytda olduğunu Müştərilər bölməsində gör.") }); return; }
    if (e.t !== "live") return;
    refreshWaiting.current();
    alertLive(e, { start: t("Yeni canlı söhbət"), message: t("Ziyarətçi yeni mesaj yazdı"), body: t("Cavab vermək üçün Müraciətlər bölməsini aç.") }, pathname.startsWith("/inbox"));
  }, Boolean(tenant)); // sahib üçün həmişə: yeni sifariş/randevu siqnalı canlı söhbət sönülü olsa da gəlir
  // Yuxarı zolaq və qırmızı nöqtələr üçün: hazırlıq, balans, diqqət tələb edənlər. Səhifə keçidində ən çox 30 saniyədə bir yenilənir.
  useEffect(() => {
    if (!tenant || isOperator || Date.now() - lastOverview.current < 30_000) return;
    lastOverview.current = Date.now();
    getOverview().then(setOverview).catch(() => {});
  }, [tenant, isOperator, pathname]);
  // Hesab dəyişəndə (mənbə qoşuldu, ad dəyişdi) və ya səhifə xəbər verəndə (pingOverview: sınaq, bilik, kanal) gözləmədən yenilənir
  useEffect(() => {
    if (!tenant || isOperator) return;
    const f = () => { lastOverview.current = Date.now(); getOverview().then(setOverview).catch(() => {}); };
    f();
    window.addEventListener("ca:overview", f);
    return () => window.removeEventListener("ca:overview", f);
  }, [tenant?.updatedAt, isOperator]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PanelFrame signals={{ waiting, overview }}>
      <SuspendedBanner /><AnnouncementBanner />{children}
    </PanelFrame>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Shell>{children}</Shell></SessionProvider>;
}
