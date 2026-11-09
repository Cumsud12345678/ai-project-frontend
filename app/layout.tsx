import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource-variable/onest";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { ErrorReporter } from "@/components/error-reporter";
import { Toaster } from "@/components/ui/sonner";
import { isLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Hazırcavab", description: "Hazırcavab: saytın, WhatsApp və Telegram üçün AI köməkçi" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Açılış səhifəsində (/, /en, /ru, /tr) dil ünvandan gəlir (middleware x-locale yazır), qalan yerdə cookie-dən.
  const fromUrl = (await headers()).get("x-locale");
  const c = (await cookies()).get("lang")?.value;
  const locale = isLocale(fromUrl) ? fromUrl : isLocale(c) ? c : "az";
  return (
    <html lang={locale}>
      <body className="antialiased">
        <LocaleProvider key={locale} initial={locale}>{children}
          <ErrorReporter />
          <Toaster />
        </LocaleProvider>
        {/* Öz saytımızda çat vidjeti: yalnız .env-də verilibsə (əvvəl localhost ünvanı birbaşa yazılmışdı, production-da sınırdı) */}
        {process.env.NEXT_PUBLIC_SELF_WIDGET_SRC && process.env.NEXT_PUBLIC_SELF_WIDGET_KEY && (
          <script src={process.env.NEXT_PUBLIC_SELF_WIDGET_SRC} data-key={process.env.NEXT_PUBLIC_SELF_WIDGET_KEY} defer></script>
        )}
      </body>
    </html>
  );
}
