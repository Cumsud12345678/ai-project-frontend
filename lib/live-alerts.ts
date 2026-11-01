"use client";
import type { LiveEvent } from "@/lib/live-socket";

/**
 * Operator üçün yeni canlı söhbət xəbərdarlığı: qısa səs, brauzer bildirişi (tab gizlidirsə və ya başqa səhifədədirsə)
 * və tab başlığında sayğac. Yalnız ziyarətçidən gələn hadisələrə (by: "visitor") reaksiya verir.
 * Səs WebAudio ilə yaradılır (fayl yüklənmir); brauzer səsi yalnız istifadəçi bir dəfə səhifəyə toxunandan sonra icazə verir.
 */
const SOUND_KEY = "ca_op_sound";
let actx: AudioContext | null = null;
let unread = 0;
let baseTitle = "";

export function alertSoundOn(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
export function setAlertSound(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* yaddaş bağlıdır */ }
  if (on) unlock();
}

function unlock() {
  if (actx || typeof window === "undefined") return;
  try { const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (AC) actx = new AC(); } catch { actx = null; }
}
if (typeof window !== "undefined") {
  const once = () => { unlock(); window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) clearUnread(); });
}

/** Yeni söhbət: üç notlu, yeni mesaj: iki notlu qısa səs. */
export function playChime(kind: "start" | "message" = "message") {
  if (!alertSoundOn() || !actx) return;
  try {
    if (actx.state === "suspended") void actx.resume();
    const t0 = actx.currentTime;
    const notes = kind === "start" ? [[660, 0], [880, 0.11], [1320, 0.22]] : [[880, 0], [1320, 0.09]];
    for (const [f, at] of notes) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = f!;
      g.gain.setValueAtTime(0.0001, t0 + at!); g.gain.exponentialRampToValueAtTime(0.16, t0 + at! + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at! + 0.25);
      o.connect(g); g.connect(actx.destination); o.start(t0 + at!); o.stop(t0 + at! + 0.27);
    }
  } catch { /* səs vacib deyil */ }
}

export type BrowserNotifyState = "unsupported" | "default" | "granted" | "denied";
export function browserNotifyState(): BrowserNotifyState {
  return typeof window === "undefined" || !("Notification" in window) ? "unsupported" : (Notification.permission as BrowserNotifyState);
}
export async function askBrowserNotify(): Promise<BrowserNotifyState> {
  if (browserNotifyState() === "unsupported") return "unsupported";
  try { return (await Notification.requestPermission()) as BrowserNotifyState; } catch { return browserNotifyState(); }
}

function clearUnread() {
  if (!unread) return;
  unread = 0;
  if (baseTitle) document.title = baseTitle;
}
function bumpTitle() {
  if (!document.hidden) return;
  if (!unread) baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
  unread++;
  document.title = `(${unread}) ${baseTitle}`;
}

/** Bir neçə açıq tab eyni hadisəyə təkrar səs verməsin: 3 saniyəlik qısa kilid (localStorage) */
function firstTab(key: string): boolean {
  try {
    const k = "ca_op_alert", now = Date.now(), prev = JSON.parse(localStorage.getItem(k) || "null") as { key: string; at: number } | null;
    if (prev && prev.key === key && now - prev.at < 3000) return false;
    localStorage.setItem(k, JSON.stringify({ key, at: now }));
  } catch { /* yaddaş bağlıdır: hər tab özü xəbər verir */ }
  return true;
}

/** Panel layout-u hər real vaxt hadisəsində çağırır. text: bildirişin mətnləri (dilə görə). */
export function alertLive(e: LiveEvent, text: { start: string; message: string; body: string }, onInbox: boolean) {
  if (e.t !== "live" || e.by !== "visitor" || (e.kind !== "start" && e.kind !== "message")) return;
  bumpTitle();
  if (!firstTab(`${e.id}:${e.kind}`)) return;
  // Gələn qutusu açıq və tab görünürsə: yalnız səs (söhbət onsuz da ekrandadır)
  if (onInbox && !document.hidden) { playChime(e.kind); return; }
  playChime(e.kind);
  if (browserNotifyState() !== "granted") return;
  try {
    const n = new Notification(e.kind === "start" ? text.start : text.message, { body: text.body, tag: `live-${e.id}` });
    n.onclick = () => { window.focus(); if (!location.pathname.startsWith("/inbox")) location.assign("/inbox"); n.close(); };
  } catch { /* bəzi mobil brauzerlər new Notification icazə vermir */ }
}
