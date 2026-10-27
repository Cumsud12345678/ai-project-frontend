"use client";
import { Headset, Send, Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { useI18n } from "@/lib/i18n";

export type ChatMsg =
  | { from: "user" | "bot"; text: string; note?: string }
  | { from: "operator"; text: string; name: string }
  | { from: "system"; text: string }
  | { from: "typing"; text: string };

/** Açılış səhifəsindəki statik telefon söhbəti: mesajlar ekrana girəndə bir-bir görünür. Real məlumat yoxdur, yalnız nümunədir. */
export function PhoneChat({ title, subtitle, messages, label }: { title: string; subtitle: string; messages: ChatMsg[]; label: string }) {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-x-4 -bottom-3 top-6 rounded-[2rem] bg-[var(--l-mist)]" aria-hidden />
      <div className="relative flex flex-col overflow-hidden rounded-3xl border border-[var(--l-line)] bg-white shadow-[0_24px_60px_-24px_rgba(12,42,37,.35)]" role="img" aria-label={label}>
        <div className="flex items-center gap-3 bg-[var(--l-teal)] px-4 py-3.5 text-white">
          <span className="grid size-9 place-items-center rounded-full bg-white/15"><Sparkles size={18} aria-hidden /></span>
          <div className="leading-tight"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-white/75">{subtitle}</p></div>
        </div>
        <div className="flex min-h-[22rem] flex-col gap-3 bg-[#f4f7f4] p-4 text-sm" aria-hidden>
          {messages.map((m, i) => {
            const d = i * 380;
            if (m.from === "user") return <Reveal key={i} delay={d} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--l-teal)] px-3.5 py-2.5 text-white">{m.text}</Reveal>;
            if (m.from === "bot") return (
              <Reveal key={i} delay={d} className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">
                {m.text}
                {m.note && <p className="mt-2 inline-flex rounded-full bg-[var(--l-mist)] px-2.5 py-1 text-xs text-[#41594f]">{m.note}</p>}
              </Reveal>
            );
            if (m.from === "operator") return (
              <Reveal key={i} delay={d} className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--l-orange-d)]/30 bg-white px-3.5 py-2.5 shadow-sm">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--l-orange-d)]"><Headset size={13} aria-hidden />{m.name}</p>
                <p>{m.text}</p>
              </Reveal>
            );
            if (m.from === "system") return <Reveal key={i} delay={d} className="mx-auto rounded-full bg-[var(--l-mist)] px-3 py-1 text-xs text-[#41594f]">{m.text}</Reveal>;
            return (
              <Reveal key={i} delay={d} className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-xs text-[#58706a] shadow-sm">
                <span className="flex gap-1">{[0, 1, 2].map((k) => <span key={k} className="size-1.5 animate-bounce rounded-full bg-[var(--l-orange-d)]/70" style={{ animationDelay: `${k * 120}ms` }} />)}</span>{m.text}
              </Reveal>
            );
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--l-line)] bg-white p-3" aria-hidden>
          <div className="flex min-h-10 flex-1 items-center rounded-xl border border-[var(--l-line)] px-3 text-sm text-[#8a9b95]">{t("Mesajınızı yazın…")}</div>
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--l-orange-d)] text-white"><Send size={16} /></span>
        </div>
      </div>
    </div>
  );
}
