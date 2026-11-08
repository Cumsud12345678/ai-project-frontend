import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource-variable/onest";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { ErrorReporter } from "@/components/error-reporter";
import { Toaster } from "@/components/ui/sonner";
import { isLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Car Advisor", description: "Car Advisor admin panel" };

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
        <script src="http://localhost:4000/widget.js" data-key="wk_f3ee83903158050aa61d9009298f16c6" defer></script>
      </body>
    </html>
  );
}
