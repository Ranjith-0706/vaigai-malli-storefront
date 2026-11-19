import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// The demo is deliberately not indexable. Flip `allow` when a real client launches.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
