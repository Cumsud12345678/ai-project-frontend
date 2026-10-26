import { cookies } from "next/headers";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/onest";
import { Landing } from "@/components/landing/landing";
import { landingMetadata } from "@/lib/landing-seo";

export const metadata = landingMetadata("az");

export default async function HomePage() {
  const signedIn = (await cookies()).has("ca_session");
  return (
    <>
      <noscript>
        <style>
          {".landing .l-reveal{opacity:1!important;transform:none!important}.landing .l-draw,.landing .l-draw-y{transform:none!important}"}
        </style>
      </noscript>
      <Landing signedIn={signedIn} />
    </>
  );
}
