import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource-variable/onest";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { isLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Car Advisor", description: "Car Advisor admin panel" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Açılış səhifəsində (/, /en, /ru) dil ünvandan gəlir (middleware x-locale yazır), qalan yerdə cookie-dən.
  const fromUrl = (await headers()).get("x-locale");
  const c = (await cookies()).get("lang")?.value;
  const locale = isLocale(fromUrl) ? fromUrl : isLocale(c) ? c : "az";
  return (
    <html lang={locale}>
      <body className="antialiased"><LocaleProvider key={locale} initial={locale}>{children}<Toaster /></LocaleProvider></body>
    </html>
  );
}
