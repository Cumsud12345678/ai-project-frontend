// Server və client tərəfindən import oluna bilən sadə dil tipləri (React yoxdur).
export type Locale = "az" | "en" | "ru";
export const isLocale = (v: unknown): v is Locale => v === "az" || v === "en" || v === "ru";
