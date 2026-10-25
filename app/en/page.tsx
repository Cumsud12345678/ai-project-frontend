import HomePage from "../page";
import { landingMetadata } from "@/lib/landing-seo";

export const metadata = landingMetadata("en");

// Eyni açılış səhifəsi; dil middleware-dəki x-locale başlığı ilə ünvandan gəlir.
export default HomePage;
