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
      <script src="http://localhost:4000/widget.js" data-key="wk_60f6cd81c9437893b9c2c2b70fa04d4b" defer></script>
      <Landing signedIn={signedIn} />
    </>
  );
}
