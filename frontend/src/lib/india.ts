export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side validation mirrors the API rules; the API remains authoritative. */
export function validateCheckout(f: CheckoutForm, needsAddress: boolean): Partial<Record<keyof CheckoutForm, string>> {
  const e: Partial<Record<keyof CheckoutForm, string>> = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email address";
  if (!/^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(f.phone.trim())) e.phone = "Enter a valid 10-digit Indian mobile number";
  if (needsAddress) {
    if (f.line1.trim().length < 3) e.line1 = "Enter your street address";
    if (f.city.trim().length < 2) e.city = "Enter your city";
    if (!INDIAN_STATES.includes(f.state)) e.state = "Select your state or union territory";
    if (!/^[1-9]\d{5}$/.test(f.pincode.trim())) e.pincode = "Enter a valid 6-digit PIN code";
  }
  return e;
}
