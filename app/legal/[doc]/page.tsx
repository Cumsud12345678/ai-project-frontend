import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { COMPANY } from "@/lib/legal/company";
import type { LegalDocId, LegalPack } from "@/lib/legal/types";
import az from "@/lib/legal/az";
import en from "@/lib/legal/en";
import ru from "@/lib/legal/ru";
import tr from "@/lib/legal/tr";
import { isLocale, type Locale } from "@/lib/locale";

// Hüquqi sənədlər: /legal/terms, /legal/privacy, /legal/refund. Dil: ?lang=… → "lang" kukisi → az.
// Mətnlər lib/legal/{az,en,ru,tr}.ts-də, operator məlumatı lib/legal/company.ts-də (.env).
const PACKS: Record<Locale, LegalPack> = { az, en, ru, tr };
const DOCS: LegalDocId[] = ["terms", "privacy", "refund"];
const LANGS: [Locale, string][] = [["az", "AZ"], ["en", "EN"], ["ru", "RU"], ["tr", "TR"]];
const NO_EMAIL: Record<Locale, string> = { az: "dəstək xidmətimizə", en: "our support team", ru: "в нашу поддержку", tr: "destek ekibimize" };

type Props = { params: Promise<{ doc: string }>; searchParams: Promise<{ lang?: string }> };

export function generateStaticParams() { return DOCS.map((doc) => ({ doc })); }

async function resolve(props: Props) {
  const { doc } = await props.params;
  if (!DOCS.includes(doc as LegalDocId)) notFound();
  const q = (await props.searchParams).lang;
  const c = (await cookies()).get("lang")?.value;
  const lang: Locale = isLocale(q) ? q : isLocale(c) ? c : "az";
  return { id: doc as LegalDocId, lang, pack: PACKS[lang] };
}

const fill = (s: string, lang: Locale) => s
  .replaceAll("{brand}", COMPANY.brand)
  .replaceAll("{operator}", COMPANY.entity || COMPANY.brand)
  .replaceAll("{email}", COMPANY.email || NO_EMAIL[lang]);

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id, lang, pack } = await resolve(props);
  return { title: `${pack.docs[id].title} · ${COMPANY.brand}`, description: fill(pack.docs[id].summary, lang), robots: { index: true, follow: true } };
}

/** **qalın** və e-poçt ünvanını link kimi göstərir */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+\.[\w.-]+)/g);
  return <>{parts.map((p, i) => p.startsWith("**") ? <strong key={i} className="font-semibold text-zinc-900">{p.slice(2, -2)}</strong>
    : /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(p) ? <a key={i} href={`mailto:${p}`} className="font-medium text-zinc-900 underline underline-offset-2">{p}</a> : p)}</>;
}

/** Ardıcıl "- " bəndləri bir siyahıya yığılır */
function Body({ lines, lang }: { lines: string[]; lang: Locale }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) out.push(<ul key={`u${out.length}`} className="my-3 flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-400">{list.map((l, i) => <li key={i}><Rich text={l} /></li>)}</ul>); list = []; };
  for (const raw of lines) {
    const l = fill(raw, lang);
    if (l.startsWith("- ")) { list.push(l.slice(2)); continue; }
    flush();
    out.push(<p key={`p${out.length}`} className="my-3"><Rich text={l} /></p>);
  }
  flush();
  return <>{out}</>;
}

export default async function LegalPage(props: Props) {
  const { id, lang, pack } = await resolve(props);
  const doc = pack.docs[id];
  const q = (l: Locale) => (l === "az" ? "" : `?lang=${l}`);
  const date = new Intl.DateTimeFormat({ az: "az-AZ", en: "en-GB", ru: "ru-RU", tr: "tr-TR" }[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(COMPANY.updated));

  return (
    <div lang={lang} className="min-h-dvh bg-white text-zinc-700">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={COMPANY.brand}>
            <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-white"><MessagesSquare size={16} aria-hidden /></span>
            <span className="font-semibold text-zinc-950">{COMPANY.brand}</span>
          </Link>
          <nav aria-label="Language" className="flex items-center gap-1 text-xs">
            {LANGS.map(([l, label]) => (
              <Link key={l} href={`/legal/${id}${q(l)}`} hrefLang={l} aria-current={l === lang ? "true" : undefined}
                className={l === lang ? "rounded-md bg-zinc-950 px-2 py-1 font-medium text-white" : "rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}>{label}</Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <nav aria-label={pack.ui.home} className="no-scrollbar -mx-1 mb-8 flex gap-1.5 overflow-x-auto px-1">
          {DOCS.map((d) => (
            <Link key={d} href={`/legal/${d}${q(lang)}`} aria-current={d === id ? "page" : undefined}
              className={d === id ? "shrink-0 rounded-full bg-zinc-950 px-3.5 py-1.5 text-sm font-medium text-white" : "shrink-0 rounded-full border border-zinc-200 px-3.5 py-1.5 text-sm text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"}>
              {pack.ui.docs[d]}
            </Link>
          ))}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{pack.ui.onThisPage}</p>
              <ol className="flex flex-col gap-1.5 border-l border-zinc-200 text-sm">
                {doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-0.5 pl-3 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900">{s.h.replace(/^\d+\.\s*/, "")}</a></li>)}
              </ol>
            </div>
          </aside>

          <article className="max-w-3xl text-[15px] leading-7">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{doc.title}</h1>
            <p className="mt-3 text-base text-zinc-500">{fill(doc.summary, lang)}</p>
            <p className="mt-4 text-sm text-zinc-400">{pack.ui.updated}: <time dateTime={COMPANY.updated}>{date}</time></p>

            <div className="mt-10 flex flex-col gap-10">
              {doc.sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-lg font-semibold text-zinc-950">{s.h}</h2>
                  <Body lines={s.body} lang={lang} />
                </section>
              ))}
            </div>

            <dl className="mt-14 grid gap-x-6 gap-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-zinc-500">{pack.ui.operator}</dt><dd className="font-medium text-zinc-900">{COMPANY.entity || COMPANY.brand}</dd>
              {COMPANY.voen && <><dt className="text-zinc-500">{pack.ui.voen}</dt><dd className="font-medium text-zinc-900">{COMPANY.voen}</dd></>}
              {COMPANY.address && <><dt className="text-zinc-500">{pack.ui.address}</dt><dd className="font-medium text-zinc-900">{COMPANY.address}</dd></>}
              {COMPANY.email && <><dt className="text-zinc-500">{pack.ui.contact}</dt><dd><a href={`mailto:${COMPANY.email}`} className="font-medium text-zinc-900 underline underline-offset-2">{COMPANY.email}</a></dd></>}
            </dl>
          </article>
        </div>
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:px-6">
          <p>© {new Date().getFullYear()} {COMPANY.brand}</p>
          <p className="flex gap-4">{DOCS.map((d) => <Link key={d} href={`/legal/${d}${q(lang)}`} className="hover:text-zinc-900">{pack.ui.docs[d]}</Link>)}</p>
        </div>
      </footer>
    </div>
  );
}
