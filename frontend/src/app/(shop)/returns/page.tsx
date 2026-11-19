import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Returns" };

export default function Returns() {
  return (
    <InfoPage eyebrow="Help" title="Returns & exchanges" intro="A sample policy to show where a real one would sit.">
      <h2>Sample policy</h2>
      <ul>
        <li>Report damage or a wrong item within 48 hours of delivery, with photos.</li>
        <li>Unused sarees with tags and original packing may be exchanged within 7 days (sample window).</li>
        <li>Blouse stitching, falls and pico work, if ever offered, would be non-returnable.</li>
        <li>Refunds, when approved, would go back to the original payment method after the saree is inspected.</li>
      </ul>
      <p>None of this has been approved by a business. The demo shop does not take real payments, so no refunds are ever issued.</p>
    </InfoPage>
  );
}
