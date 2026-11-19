# Client handoff — Vaigai Malli demo

## 1. What this is (plain English)
A working preview of an online saree shop. A customer can browse, choose a saree, "pay", and get an order reference; you (the shop owner) can sign in and manage products and orders. **Nothing is real yet**: the shop name, sarees, prices, photos, policies and contact details are made-up samples, and no money is ever charged.

## 2. Five-minute walkthrough

**As a customer**
1. Open the shop home page. Notice the banner: it is a demo.
2. **Shop all sarees** → tick *Soft Silk* or a colour on the left (on a phone: tap *Filters & sort*), try *Sort by price*. Search "ivory". Search "zzzz" to see the "nothing found" page.
3. Click a saree: look at the three images, fabric, colour, price, stock note ("Only 2 left", "Sold out"), care and delivery information.
4. **Add to cart** → open the cart; change the quantity (it stops at the stock available). Close the browser and come back: the cart is still there.
5. **Proceed to checkout** → fill in name, email, mobile and an Indian address. Choose *Flat-rate delivery* or *Local pickup* and see the cost before you confirm. Large orders show free delivery.
6. **Place order** → on the payment screen choose **"Simulate a failed payment"** to see an error (your saree stays reserved), then **"Complete demo payment"**. A confirmation page shows your order reference (like `VM-7K2P9XQA`).
7. Go to **Track order**, enter the reference and your email to see its progress.

**As the shop owner** (sign in at `/admin`; credentials are set up by your developer — there is no default password)
1. **Dashboard**: orders waiting for action, last 7 days, revenue (demo), low stock.
2. **Orders** → open an order → press *Confirm order*, *Mark as packed*. Try *Mark as shipped* without a tracking number: it asks for one. Enter a courier name + number, ship, then *Mark as delivered*. The customer's tracking page updates. *Cancel order* returns the sarees to stock.
3. **Products** → open one, change the price or stock, save; refresh the shop to see it. *Archive* hides a saree from the shop without deleting it. *New product* adds one (images by web address or upload).
4. **Collections** and **Shipping** (rates and the "free delivery above ₹…" amount) are also editable here.

## 3. What we need from you before launch

| Topic | What to decide / provide |
|---|---|
| **Brand & domain** | Shop name (the demo's "Vaigai Malli" is invented and not trademark-checked), logo, colours if different, domain name, who registers/owns it |
| **Products** | For each saree: approved photos you own or may use (front drape, border/pallu close-up, texture; ideally on a plain background), accurate name, fabric (e.g. pure silk vs silk-cotton), colour, length, zari type, care instructions, any authenticity marks you are entitled to claim (e.g. Silk Mark, GI) |
| **Prices** | Selling price (and optional "compare at" price) for each saree, in ₹; whether prices include GST |
| **Inventory** | Real stock count per item; are pieces one-of-a-kind (stock 1) or restocked? Who updates stock and how often? |
| **Shipping** | Which regions you deliver to (India-wide? states?), flat vs weight/region rates, free-delivery threshold, packing and dispatch time, which couriers you use, how you will enter tracking numbers, whether local pickup is offered and from where, delivery to international addresses (not supported today) |
| **Returns & exchanges** | Real policy: window, condition, who pays shipping, exchange vs refund, damaged/wrong item process |
| **Support contact** | Real email, phone/WhatsApp, address, opening hours, who answers and within how long |
| **Payment account** | Business bank account and a payment gateway account (we plan Razorpay: needs KYC documents, business PAN/GST details, settlement account). Decide which methods to accept (UPI, cards, netbanking, COD or not) |
| **Tax & invoicing** | GST registration number, tax rate per product category, HSN codes, invoice numbering/format, whether to show GST breakup, handling for inter-state vs intra-state sales |
| **Legal text** | Privacy notice, terms of sale, returns, shipping policy reviewed or written by a qualified professional (the demo text is placeholder only) |
| **Notifications** | Do you want order e-mails/SMS/WhatsApp messages? From which address/number? |
| **Admin users** | Who needs admin access (currently one role, all-powerful) and who manages passwords |
| **Operations** | Who packs and ships orders, refund process (manual today), what to do when a saree sells out while in a customer's cart |

## 4. What happens next
See FINAL_REPORT.md §5 for the technical steps (payment gateway, e-mail, invoices, hosting, testing on real devices). Typical order: gather the table above → load real products and photos → connect the payment gateway in test mode → staging review with you → go-live checklist.

## 5. Things to know
* Orders placed in the demo are fake; the dashboard's "revenue" is pretend money.
* A customer's items are held for 30 minutes while they pay, then released.
* Prices shown on the shop are checked again by the server at checkout; they cannot be changed from the customer's browser.
* The demo is hidden from search engines on purpose.
