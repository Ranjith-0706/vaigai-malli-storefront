import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "./globals.css";
import { CartProvider } from "@/lib/CartProvider";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline} (demo store)`, template: `%s · ${SITE.name} (demo)` },
  description:
    "Vaigai Malli is a demo saree storefront: Kanchipuram-style silks, soft silks and handloom cottons with a simulated checkout. All products and policies are sample data.",
  openGraph: { siteName: SITE.name, type: "website", locale: "en_IN" },
  robots: { index: false, follow: false }, // demo: never index until a real client launches
};

export const viewport: Viewport = { themeColor: "#651021", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
