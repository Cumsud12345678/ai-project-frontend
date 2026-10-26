"use client";
import { useEffect, useRef, useState } from "react";
import { getLiveTicket } from "@/lib/api";

/**
 * Canlı söhbət üçün real vaxt bağlantısı (WebSocket). Soket yalnız siqnal verir ("yeni mesaj var", "ziyarətçi yazır");
 * mesajlar yenə adi sorğularla yüklənir. Qoşulma alınmasa və ya qırılsa səhifələr əvvəlki kimi polling ilə işləyir.
 * Bütün səhifələr tək bir bağlantıdan istifadə edir (menyudakı sayğac, gələnlər qutusu).
 */
export type LiveEvent = { t: "live"; id: string; kind: "start" | "message" | "close" } | { t: "typing"; id: string };
type Listener = (e: LiveEvent) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<(on: boolean) => void>();
let ws: WebSocket | null = null;
let connected = false;
let connecting = false;
let tries = 0;
let retry: ReturnType<typeof setTimeout> | undefined;
let closeLater: ReturnType<typeof setTimeout> | undefined;
let typingSentAt = 0;

const setConnected = (v: boolean) => { if (connected !== v) { connected = v; statusListeners.forEach((f) => f(v)); } };
const backoff = () => Math.min(30000, 1000 * 2 ** Math.min(tries, 5));

function connect() {
  if (ws || connecting || typeof WebSocket === "undefined" || !listeners.size) return;
  connecting = true;
  getLiveTicket().then(({ ticket, url }) => {
    if (!listeners.size) return;
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => sock.send(JSON.stringify({ t: "auth", role: "operator", ticket }));
    sock.onmessage = (ev) => {
      let m: { t?: string };
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === "ready") { tries = 0; setConnected(true); return; }
      if (m.t === "live" || m.t === "typing") listeners.forEach((f) => f(m as LiveEvent));
    };
    sock.onclose = (ev) => {
      if (ws === sock) ws = null;
      setConnected(false);
      if (!listeners.size) return;
      if (ev.code === 4408) tries = 0; else tries++; // 4408: saatlıq yenilənmə, dərhal yenidən qoşulur
      clearTimeout(retry); retry = setTimeout(connect, ev.code === 4408 ? 300 : backoff());
    };
    sock.onerror = () => { /* onclose yenidən qoşulur */ };
  }).catch(() => { tries++; clearTimeout(retry); if (listeners.size) retry = setTimeout(connect, backoff()); })
    .finally(() => { connecting = false; });
}

function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  clearTimeout(closeLater);
  connect();
  return () => {
    listeners.delete(cb);
    if (listeners.size) return;
    // React yenidən qoşulanda (StrictMode, səhifə keçidi) bağlantı boş yerə bağlanmasın
    closeLater = setTimeout(() => {
      if (listeners.size) return;
      clearTimeout(retry);
      const s = ws; ws = null; if (s) { s.onclose = null; try { s.close(); } catch { /* artıq bağlıdır */ } }
      setConnected(false);
    }, 2000);
  };
}

/** Operator ziyarətçiyə "yazır…" siqnalı göndərir (3 saniyədə bir). */
export function sendTyping(chatId: string) {
  if (!ws || !connected || Date.now() - typingSentAt < 3000) return;
  typingSentAt = Date.now();
  try { ws.send(JSON.stringify({ t: "typing", id: chatId })); } catch { /* bağlanır */ }
}

/** Hadisələri dinləyir; `active` false olsa heç nə qoşulmur (canlı söhbət söndürülübsə). Qaytarır: soket qoşuludurmu. */
export function useLiveEvents(cb: Listener, active = true): boolean {
  const ref = useRef(cb);
  ref.current = cb;
  const [on, setOn] = useState(connected);
  useEffect(() => {
    if (!active) return;
    const f = (on2: boolean) => setOn(on2);
    statusListeners.add(f);
    setOn(connected);
    const off = subscribe((e) => ref.current(e));
    return () => { statusListeners.delete(f); off(); };
  }, [active]);
  return active && on;
}
