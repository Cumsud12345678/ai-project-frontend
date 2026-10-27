"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";

export function PasswordInput({ className, ...p }: Omit<React.ComponentProps<"input">, "type">) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...p} type={show ? "text" : "password"} className={`h-11 pr-11 ${className ?? ""}`} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t("Parolu gizlət") : t("Parolu göstər")} aria-pressed={show}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        {show ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
      </button>
    </div>
  );
}

/** Yalnız məsləhətdir (qəbul qaydasını dəyişmir): uzunluq, hərf qarışığı, rəqəm, simvol. */
export function strengthOf(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (pw !== pw.toLowerCase() && pw !== pw.toUpperCase()) s++; // həm kiçik, həm böyük hərf
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

export function PasswordStrength({ value }: { value: string }) {
  const t = useT();
  const s = strengthOf(value);
  const label = [t("Ən azı 8 simvol."), t("Zəif"), t("Orta"), t("Yaxşı"), t("Güclü")][s];
  const colors = ["bg-border", "bg-destructive", "bg-amber", "bg-chart-2", "bg-chart-2"];
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${s >= i ? colors[s] : "bg-border"}`} />)}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
