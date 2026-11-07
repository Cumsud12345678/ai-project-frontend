"use client";
// Səhifə başlığı: solda ad və qısa izah, sağda əsas düymələr (məs. "+ Yeni ...").
export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-72">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Sayğaclı "pill" filtr (Hamısı (3) · Saytlar (1) ...) */
export function FilterPills<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number; icon?: React.ReactNode }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {items.map((i) => (
        <button key={i.value} type="button" role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${value === i.value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
          {i.icon}{i.label}{typeof i.count === "number" && <span className="tabular-nums text-muted-foreground">({i.count})</span>}
        </button>
      ))}
    </div>
  );
}
