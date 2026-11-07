"use client";
// Köməkçi profilinin bir hissəsini saxlayan kart: hər kartın öz "Saxla" düyməsi var, yalnız onun sahələri göndərilir.
import { useState } from "react";
import { toast } from "sonner";
import { saveProfile, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const PROFILE_DEFAULTS: Profile = { language: "az", tone: "dostcasına", maxResults: 5, extraInstructions: "", logQueries: true, generalKnowledge: true };

/** Hər mövzunun öz kartı və öz "Saxla" düyməsi var; yalnız həmin kartın sahələri göndərilir. */
export function ProfileCard({ title, description, keys, children }: {
  title: string; description: string; keys: (keyof Profile)[];
  children: (draft: Profile, set: (patch: Profile) => void) => React.ReactNode;
}) {
  const { tenant, refresh } = useSession();
  const { t } = useI18n();
  const pick = (p: Profile) => Object.fromEntries(keys.map((k) => [k, p[k]])) as Profile;
  const start = () => pick({ ...PROFILE_DEFAULTS, ...(tenant?.config.profile ?? {}) });
  const [base, setBase] = useState<Profile>(start);
  const [draft, setDraft] = useState<Profile>(base);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [, setError] = useState("");
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || state === "busy") return;
    setState("busy");
    setError("");
    try {
      const body = { ...draft };
      if (keys.includes("maxResults")) body.maxResults = Math.min(10, Math.max(1, Math.round(Number(body.maxResults) || 5)));
      await saveProfile(body);
      await refresh();
      setBase(body);
      setDraft(body);
      setState("saved");
      toast.success(t("Saxlandı."));
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
      setState("idle");
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4" onChange={() => setState("idle")}>{children(draft, (patch) => { setState("idle"); setDraft((d) => ({ ...d, ...patch })); })}</CardContent>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button disabled={!dirty || state === "busy"}>{state === "busy" ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </form>
    </Card>
  );
}

