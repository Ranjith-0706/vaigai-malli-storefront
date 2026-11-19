import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy notice" intro="What this demo does with the details you type in.">
      <h2>What is stored</h2>
      <ul>
        <li>Your cart contents are kept in your browser&rsquo;s local storage, not on a server, until you place an order.</li>
        <li>When you place a demo order, your name, email, phone and address are saved in the demo database so an admin can fulfil and you can look the order up.</li>
        <li>No card, UPI or bank details are ever collected. Payment is simulated.</li>
        <li>The admin session uses one httpOnly cookie. No advertising or analytics trackers are included.</li>
      </ul>
      <h2>Before launch</h2>
      <p>A real shop needs a privacy notice reviewed by a qualified professional, covering retention, processors, and rights under India&rsquo;s Digital Personal Data Protection Act, 2023. This sample is not legal advice.</p>
    </InfoPage>
  );
}
