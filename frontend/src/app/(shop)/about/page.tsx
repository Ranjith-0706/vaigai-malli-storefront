import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Our craft" };

export default function About() {
  return (
    <InfoPage eyebrow="About" title="Our craft" intro="Vaigai Malli is an invented brand used to demonstrate a saree storefront.">
      <h2>The name</h2>
      <p>
        <em>Vaigai</em> is the river of Madurai, the temple city; <em>malli</em> is jasmine, the flower strung into garlands (thodarkodi) for festivals and weddings. The identity pairs a temple arch with a jasmine bloom.
      </p>
      <h2>What the demo shows</h2>
      <p>
        Three kinds of saree appear in the catalogue: Kanchipuram-style silks with zari borders, lighter soft silks, and handloom cottons and silk-cottons. Descriptions use well-known weaving terms such as <em>korvai</em> (a border woven separately and interlocked with the body), <em>pallu</em> and <em>zari</em>.
      </p>
      <h2>What is not real</h2>
      <ul>
        <li>The products, prices and stock are invented sample data.</li>
        <li>The artwork is original illustration made for this project, not photography of real sarees.</li>
        <li>No weaver, cooperative or certification is claimed. A real client must supply their own story and any authenticity marks.</li>
      </ul>
    </InfoPage>
  );
}
