"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { LangDropdown } from "@/components/lang-dropdown";

import { isLocale, type Locale } from "./locale";
export { isLocale };
export type { Locale };
export const LOCALES: { code: Locale; label: string; name: string }[] = [
  { code: "az", label: "AZ", name: "Azərbaycanca" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
];
const COOKIE = "lang";
const INTL: Record<Locale, string> = { az: "az", en: "en-US", ru: "ru-RU" };

// Açar həmişə Azərbaycan mətnidir (mənbə dil). Tərcümə tapılmasa, Azərbaycan mətni göstərilir.
const DICT: Record<Locale, Record<string, string>> = { az: {}, en, ru };

type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

export function translate(locale: Locale, key: string, vars?: Vars): string {
  const text = DICT[locale][key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: T; num: (n: number) => string; date: (iso: string) => string; day: (iso: string) => string; short: (iso: string) => string };
const I18n = createContext<Ctx | null>(null);

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, set] = useState<Locale>(initial);
  const setLocale = useCallback((l: Locale) => {
    set(l);
    try { document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /* kuki bağlıdırsa seçim yalnız bu səhifə üçündür */ }
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo<Ctx>(() => ({
    locale, setLocale,
    t: (key, vars) => translate(locale, key, vars),
    num: (n) => n.toLocaleString(INTL[locale]),
    date: (iso) => new Date(iso).toLocaleString(INTL[locale]),
    day: (iso) => new Date(iso).toLocaleDateString(INTL[locale]),
    short: (iso) => new Date(iso).toLocaleString(INTL[locale], { dateStyle: "short", timeStyle: "short" }),
  }), [locale, setLocale]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18n);
  if (!c) throw new Error("useI18n yalnız LocaleProvider daxilində işləyir");
  return c;
}
export const useT = () => useI18n().t;

/** Dil seçimi: bayraq və adla açılan siyahı. `up`: siyahı yuxarı açılır (səhifənin altında olanda). */
export function LangSwitch({ className = "", up = false, alignRight = true, showName = false }: { className?: string; up?: boolean; alignRight?: boolean; showName?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <LangDropdown options={LOCALES} value={locale} onChange={setLocale} label={t("Dil")} className={className} up={up} alignRight={alignRight} showName={showName} />;
}
