import type { Metadata } from "next";
import type { Locale } from "@/lib/locale";

const META: Record<Locale, { title: string; description: string }> = {
  az: { title: "Car Advisor: saytın üçün AI köməkçi", description: "Ziyarətçi sual yazır, AI köməkçi saytındakı elan, məhsul və xidmətləri tapır, sənədlərinə əsasən cavab verir və lazım olanda operatora yönləndirir." },
  en: { title: "Car Advisor: an AI assistant for your website", description: "Visitors type a question and the AI assistant finds your listings, products or services, answers from your documents and hands off to an operator when needed." },
  ru: { title: "Car Advisor: ИИ-помощник для вашего сайта", description: "Посетитель пишет вопрос, а ИИ-помощник находит объявления, товары или услуги, отвечает по вашим документам и при необходимости передаёт оператору." },
};
const PATH: Record<Locale, string> = { az: "/", en: "/en", ru: "/ru" };

/** SITE_URL (məs. https://caradvisor.az) verilibsə canonical və hreflang də əlavə olunur: onlar mütləq ünvan tələb edir. */
export function landingMetadata(locale: Locale): Metadata {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  const m = META[locale];
  return {
    title: m.title,
    description: m.description,
    openGraph: { title: m.title, description: m.description, locale: locale === "az" ? "az_AZ" : locale === "en" ? "en_US" : "ru_RU", type: "website" },
    ...(base ? {
      metadataBase: new URL(base),
      alternates: { canonical: PATH[locale], languages: { az: "/", en: "/en", ru: "/ru", "x-default": "/" } },
    } : {}),
  };
}
