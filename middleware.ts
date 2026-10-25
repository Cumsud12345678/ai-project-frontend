import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/", "/en", "/ru", "/login", "/register", "/verify", "/forgot"];
// Açılış səhifəsinin dili ünvandan gəlir: / = az, /en = en, /ru = ru (cookie-dən asılı deyil).
const LANDING_LOCALE: Record<string, string> = { "/": "az", "/en": "en", "/ru": "ru" };

// Yalnız sürətli yönləndirmə: cookie yoxdursa giriş səhifəsinə. Sessiyanın həqiqiliyini backend yoxlayır.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
