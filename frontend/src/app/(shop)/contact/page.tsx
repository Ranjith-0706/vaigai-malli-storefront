import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <InfoPage eyebrow="Help" title="Contact" intro="How customers would reach the shop. Details below are placeholders.">
      <h2>Reach us</h2>
      <ul>
        <li>Email: {SITE.demoEmail} (not a monitored inbox)</li>
        <li>Phone: {SITE.demoPhone} (placeholder)</li>
        <li>Address: {SITE.demoAddress}</li>
        <li>Hours: Mon–Sat, 10:00–19:00 IST (sample)</li>
      </ul>
      <h2>Order questions</h2>
      <p>Include your order reference (VM-XXXXXXXX) in any message. You can also check progress yourself on the track order page.</p>
    </InfoPage>
  );
}
