"use client";
import { useState } from "react";
import { toast } from "sonner";
import { KeyReveal } from "@/components/key-reveal";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function RotateKey({ rotate, label = "Yeni açar yarat", warning }: { rotate: () => Promise<{ apiKey: string }>; label?: string; warning: string }) {
  const t = useT();
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [key, setKey] = useState("");

  async function run() {
    setStep("busy");
    try {
      setKey((await rotate()).apiKey);
      setStep("done");
    } catch (e) {
      toast.error((e as Error).message);
      setStep("idle");
    }
  }

  if (step === "done") return <KeyReveal apiKey={key} title={t("Yeni API açarı yaradıldı")} onDone={() => { setKey(""); setStep("idle"); }} />;
  return (
    <div className="flex flex-col gap-2">
      {step === "confirm" || step === "busy" ? (
        <>
          <p className="text-sm">{warning}</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={step === "busy"} onClick={run}>{step === "busy" ? t("Yenilənir…") : t("Bəli, yenilə")}</Button>
            <Button size="sm" variant="outline" disabled={step === "busy"} onClick={() => setStep("idle")}>{t("Ləğv et")}</Button>
          </div>
        </>
      ) : (
        <div><Button variant="outline" onClick={() => setStep("confirm")}>{t(label)}</Button></div>
      )}
    </div>
  );
}
