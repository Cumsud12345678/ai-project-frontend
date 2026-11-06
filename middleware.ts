import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/", "/en", "/ru", "/tr", "/login", "/register", "/verify", "/forgot"];
// Açılış səhifəsinin dili ünvandan gəlir: / = az, /en = en, /ru = ru, /tr = tr (cookie-dən asılı deyil).
const LANDING_LOCALE: Record<string, string> = { "/": "az", "/en": "en", "/ru": "ru", "/tr": "tr" };

// Partnyor linki: /r/KOD və ya istənilən səhifədə ?ref=KOD → kod 90 gün kukidə saxlanır, qeydiyyat formasında avtomatik yazılır
const REF_RE = /^[A-Za-z0-9_-]{3,20}$/;
const REF_COOKIE = { name: "ref_code", maxAge: 90 * 24 * 60 * 60, path: "/", sameSite: "lax" as const };
const withRef = (res: NextResponse, code: string | null | undefined) => {
  if (code && REF_RE.test(code)) res.cookies.set({ ...REF_COOKIE, value: code.toUpperCase() });
  return res;
};

// Yalnız sürətli yönləndirmə: cookie yoxdursa giriş səhifəsinə. Sessiyanın həqiqiliyini backend yoxlayır.
export function middleware(req: NextRequest) {
  const res = route(req);
  return withRef(res, req.nextUrl.searchParams.get("ref"));
}

function route(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const short = /^\/r\/([^/]+)\/?$/.exec(pathname);
  if (short) return withRef(NextResponse.redirect(new URL("/", req.url)), decodeURIComponent(short[1]!));
  const locale = LANDING_LOCALE[pathname];
  if (locale) {
    const headers = new Headers(req.headers);
    headers.set("x-locale", locale);
    return NextResponse.next({ request: { headers } });
  }
  if (PUBLIC.includes(pathname) || req.cookies.has("ca_session")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|sitemap.xml|robots.txt).*)"] };
