import { LangSwitch } from "@/lib/i18n";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">
      <div className="flex flex-col gap-6 px-6 py-10 bg-white rounded-3xl shadow">
        <div>
          <h3 className="text-2xl font-semibold">Daxil ol</h3>
        </div>
        {/* <div>
          <div className="mb-6 flex items-center justify-between"><p className="text-sm font-semibold text-primary">Car Advisor</p><LangSwitch /></div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div> */}
        {children}
        {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
      </div>
    </main>
  );
}
