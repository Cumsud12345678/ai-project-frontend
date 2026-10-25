import HomePage from "../page";
import { landingMetadata } from "@/lib/landing-seo";

export const metadata = landingMetadata("ru");

// Eyni açılış səhifəsi; dil middleware-dəki x-locale başlığı ilə ünvandan gəlir.
export default HomePage;
