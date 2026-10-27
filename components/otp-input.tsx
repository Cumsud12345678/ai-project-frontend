"use client";
import { useRef } from "react";
import { useT } from "@/lib/i18n";

/** 6 xanalı kod sahəsi: avtomatik keçid, Backspace geri, yapışdırma və SMS kodunu avtodoldurma dəstəyi. */
export function OtpInput({ value, onChange, id = "code", autoFocus = false }: { value: string; onChange: (v: string) => void; id?: string; autoFocus?: boolean }) {
  const t = useT();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  const set = (next: string) => onChange(next.replace(/\D/g, "").slice(0, 6));
  const focus = (i: number) => refs.current[Math.max(0, Math.min(5, i))]?.focus();

  return (
    <div role="group" aria-label={t("Təsdiq kodu")} className="flex gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} id={i === 0 ? id : `${id}-${i}`} inputMode="numeric" pattern="\d" maxLength={6} autoFocus={autoFocus && i === 0}
          autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={t("Rəqəm {n}", { n: i + 1 })} value={d.trim()}
          className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-card text-center font-mono text-xl font-semibold focus-visible:outline-2 focus-visible:outline-primary"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) { set(value.slice(0, i) + v); focus(i + v.length); return; } // avtodoldurma çoxrəqəmli gətirəndə
            set(value.slice(0, i) + v + value.slice(i + 1));
            if (v) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d.trim()) { e.preventDefault(); set(value.slice(0, Math.max(0, i - 1))); focus(i - 1); }
            else if (e.key === "ArrowLeft") focus(i - 1);
            else if (e.key === "ArrowRight") focus(i + 1);
          }}
          onPaste={(e) => { const v = e.clipboardData.getData("text").replace(/\D/g, ""); if (v) { e.preventDefault(); set(v); focus(v.length); } }}
          onFocus={(e) => e.currentTarget.select()} />
      ))}
    </div>
  );
}
