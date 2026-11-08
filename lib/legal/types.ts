// Hüquqi sənədin quruluşu. Mətndə {brand}, {operator}, {email} yer tutucuları göstərilərkən əvəz olunur.
// Abzas "- " ilə başlayırsa siyahı bəndidir; "**qalın**" dəstəklənir.
export type LegalDocId = "terms" | "privacy" | "refund";
export type LegalSection = { id: string; h: string; body: string[] };
export type LegalDoc = { title: string; summary: string; sections: LegalSection[] };
export type LegalUi = {
  updated: string; operator: string; voen: string; address: string; contact: string; onThisPage: string; home: string;
  docs: Record<LegalDocId, string>; note: string;
};
export type LegalPack = { ui: LegalUi; docs: Record<LegalDocId, LegalDoc> };
