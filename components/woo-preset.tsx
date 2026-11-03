"use client";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useT } from "@/lib/i18n";
import { wooBaseUrl, wooConfig } from "@/lib/presets/woocommerce";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** WooCommerce mağazası: yalnız sayt ünvanı yazılır, konfiqurasiya hazır gəlir. Sonra adi "Yoxla" düyməsi. */
export function WooPreset({ onChange }: { onChange: (next: string) => void }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  function make(e: React.FormEvent) {
    e.preventDefault();
    const base = wooBaseUrl(url);
    if (!base) { setErr(t("Saytın ünvanını yaz, məs. https://magaza.az (https olmalıdır).")); return; }
    setErr("");
    onChange(JSON.stringify(wooConfig(base), null, 2));
    setDone(true);
  }
  return (
    <form onSubmit={make} className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t("Saytın WordPress + WooCommerce üzərindədirsə, API açarı və texniki iş lazım deyil: yalnız saytın ünvanını yaz. Məhsullar, qiymətlər, şəkillər və kateqoriyalar WooCommerce-in açıq vitrin API-sindən oxunur.")}</p>
      <Label htmlFor="woo-url">{t("Mağazanın ünvanı")}</Label>
      <div className="flex flex-wrap gap-2">
        <Input id="woo-url" className="min-w-0 flex-1" placeholder="https://magaza.az" value={url} onChange={(e) => { setUrl(e.target.value); setDone(false); }} aria-invalid={!!err} />
        <Button disabled={!url.trim()}><ShoppingCart size={14} aria-hidden />{t("Konfiqurasiyanı hazırla")}</Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {done && <p className="text-xs text-primary">{t("Hazırdır. Aşağıda “Yoxla” düyməsinə bas: mağazadan bir neçə məhsul gəlməlidir.")}</p>}
      <p className="text-xs text-muted-foreground">{t("Qiymətlər 2 onluq rəqəmli valyuta üçün hazırlanıb (AZN, USD, EUR, TRY, RUB). Yoxlamada “məhsul gəlmədi” xətası çıxsa, saytda WooCommerce REST API bağlı ola bilər: hosting və ya təhlükəsizlik plaginində /wp-json yolunu aç.")}</p>
    </form>
  );
}
