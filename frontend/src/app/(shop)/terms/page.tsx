import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of use" intro="Sample terms for a demonstration store.">
      <h2>Demo status</h2>
      <p>This site is a software portfolio demonstration. Products, prices and stock are fictional; orders are not fulfilled; payments are simulated and no money is charged.</p>
      <h2>Pricing and availability</h2>
      <p>Displayed prices are sample prices in Indian rupees, shown as inclusive of tax for illustration. Availability is checked again when an order is placed; items can sell out while you shop.</p>
      <h2>Order reservation</h2>
      <p>Items in an unpaid order are held for 30 minutes and then released automatically.</p>
      <h2>Real terms</h2>
      <p>A live business must replace this text with terms prepared or reviewed by a qualified professional, including tax invoicing, consumer rights and dispute handling.</p>
    </InfoPage>
  );
}
