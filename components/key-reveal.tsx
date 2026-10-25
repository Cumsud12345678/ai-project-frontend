"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

// Yeni açar yalnız bir dəfə göstərilir: serverdə yalnız hash-i qalır.
export function KeyReveal({ apiKey, title, onDone }: { apiKey: string; title: string; onDone: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(apiKey); setCopied(true); toast.success(t("Açar kopyalandı.")); }
    catch { toast.error(t("Kopyalanmadı. Açarı əl ilə seçib kopyala.")); }
  }
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-amber bg-card p-4 text-sm">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{t("Bu açar yalnız indi göstərilir. Kopyalayıb təhlükəsiz yerdə saxla, sonra bağla.")}</p>
      <code className="break-all rounded-md bg-muted p-3 font-mono text-xs">{apiKey}</code>
      <div className="flex gap-2">
        <Button size="sm" onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? t("Kopyalandı") : t("Kopyala")}</Button>
        <Button size="sm" variant="outline" onClick={onDone}>{t("Saxladım, bağla")}</Button>
      </div>
    </div>
  );
}
