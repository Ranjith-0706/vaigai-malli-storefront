import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { serverApi } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { ShippingOption } from "@/lib/types";

export const metadata: Metadata = { title: "Shipping" };

export default async function Shipping() {
  const options = await serverApi<ShippingOption[]>("/shipping-options");
  return (
    <InfoPage eyebrow="Help" title="Shipping" intro="How orders would be delivered. Rates below are read live from the demo configuration.">
      <h2>Options and rates</h2>
      <ul>
        {options.map((o) => (
          <li key={o.code}>
            <strong>{o.label}</strong>: {o.price_paise === 0 ? "free" : formatINR(o.price_paise)}
            {o.free_above_paise ? `, free on orders of ${formatINR(o.free_above_paise)} or more` : ""}. {o.description}
          </li>
        ))}
      </ul>
      <h2>How fulfilment works</h2>
      <p>
        The shop packs and dispatches each order by hand and enters a tracking reference if a courier is used. This demo is <strong>not integrated with any courier</strong>, so there is no live tracking or automatic delivery estimate.
      </p>
      <p>Delivery regions and timelines are not set. A real client must decide them (see the client handoff checklist).</p>
    </InfoPage>
  );
}
