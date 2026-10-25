"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Props = {
  label: string;
  warning: string;
  /** "text": istifadəçi `expected` mətnini yazmalıdır (məs. email). "password": parolunu yazır. */
  confirm: { kind: "text"; expected: string; hint: string } | { kind: "password" };
  /** Dəyər (parol və ya yazılan mətn) ilə çağırılır. Xəta atsa mesajı göstərilir. */
  onConfirm: (value: string) => Promise<void>;
  size?: "default" | "sm";
};

/** Geri qaytarılmayan əməliyyat üçün iki addımlı təsdiq: düyməyə bas, sonra yaz və təsdiqlə. */
export function DangerAction({ label, warning, confirm, onConfirm, size = "sm" }: Props) {
  const t = useT();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const id = `danger-${label.replace(/\s+/g, "-")}`;
  const ready = confirm.kind === "password" ? value.length > 0 : value.trim().toLowerCase() === confirm.expected.toLowerCase();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || step === "busy") return;
    setStep("busy");
    setError("");
    try { await onConfirm(value); } // uğurlu olduqda çağıran səhifə bu komponenti götürür
    catch (err) { setError((err as Error).message); setStep("confirm"); }
  }

  if (step === "idle") return <div><Button size={size} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setStep("confirm")}>{t(label)}</Button></div>;
  return (
    <form onSubmit={run} className="flex flex-col gap-3 rounded-md border border-destructive/40 p-3">
      <p className="text-sm">{warning}</p>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{confirm.kind === "password" ? t("Parolunu yaz") : confirm.hint}</Label>
        <Input id={id} type={confirm.kind === "password" ? "password" : "text"} autoComplete={confirm.kind === "password" ? "current-password" : "off"} autoFocus
          value={value} onChange={(e) => setValue(e.target.value)} disabled={step === "busy"} className="max-w-sm" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={!ready || step === "busy"}>{step === "busy" ? t("Silinir…") : t("Həmişəlik sil")}</Button>
        <Button type="button" size="sm" variant="outline" disabled={step === "busy"} onClick={() => { setStep("idle"); setValue(""); setError(""); }}>{t("Ləğv et")}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
