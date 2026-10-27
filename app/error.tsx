"use client";
import { useEffect } from "react";
import { reportClientError } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** Səhifə render xətası: jurnala yazılır, istifadəçiyə yenidən cəhd düyməsi göstərilir. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => { reportClientError({ message: error.message || "Render xətası", stack: error.stack, page: location.pathname }); }, [error]);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-6">
      <h1 className="text-xl font-semibold">{t("Səhifədə xəta baş verdi")}</h1>
      <p className="text-sm text-muted-foreground">{t("Xəta qeydə alındı. Yenidən cəhd et, düzəlməsə bir az sonra qayıt.")}</p>
      <div><Button onClick={reset}>{t("Yenidən yoxla")}</Button></div>
    </main>
  );
}
