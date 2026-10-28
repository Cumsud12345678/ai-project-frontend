import HomePage from "@/app/page";
import { landingMetadata } from "@/lib/landing-seo";

export const metadata = landingMetadata("tr");

// Eyni açılış səhifəsi; dil middleware-dəki x-locale başlığı ilə ünvandan gəlir.
export default HomePage;
