export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  category: string;
  fabric: string;
  color: string;
  color_hex: string;
  price_paise: number;
  compare_at_paise: number | null;
  stock: number;
  in_stock: boolean;
  low_stock: boolean;
  featured: boolean;
  image_url: string;
  image_alt: string;
  collection_slug: string | null;
};

export type ProductImage = { id: number; url: string; alt: string; position: number };

export type ProductDetail = ProductSummary & {
  description: string;
  care: string;
  images: ProductImage[];
  collection_name: string | null;
  related: ProductSummary[];
};

export type Collection = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
};

export type ProductPage = {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  facets: { categories: string[]; colors: string[]; price_min_paise: number; price_max_paise: number };
};

export type ShippingOption = {
  code: string;
  label: string;
  description: string;
  price_paise: number;
  requires_address: boolean;
  free_above_paise: number | null;
};

export type CartLine = {
  product_id: number;
  slug: string | null;
  name: string;
  image_url: string;
  unit_price_paise: number;
  requested_quantity: number;
  quantity: number;
  max_quantity: number;
  line_total_paise: number;
  status: "ok" | "reduced" | "out_of_stock" | "unavailable";
};

export type CartQuote = {
  lines: CartLine[];
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  shipping_method: string;
  shipping_options: ShippingOption[];
  has_issues: boolean;
  free_shipping_remaining_paise: number | null;
};

export type OrderItem = { product_id: number; product_name: string; unit_price_paise: number; quantity: number };

export type Order = {
  reference: string;
  status: string;
  payment_status: string;
  customer_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  shipping_method_label: string;
  shipping_method_code: string;
  tracking_reference: string;
  reservation_expires_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  payment_mode: string;
  timeline?: { status: string; at: string }[];
};

export type AdminOrder = Order & {
  id: number;
  fulfilment_notes: string;
  payments: {
    id: number;
    provider: string;
    status: string;
    amount_paise: number;
    failure_reason: string;
    created_at: string;
  }[];
  events: { id: number; kind: string; from_status: string; to_status: string; note: string; created_at: string }[];
  allowed_transitions: string[];
};

export type OrderListItem = {
  id: number;
  reference: string;
  status: string;
  payment_status: string;
  customer_name: string;
  email: string;
  total_paise: number;
  created_at: string;
  item_count: number;
};

export type AdminProduct = ProductDetail & { is_active: boolean; collection_id: number | null; created_at: string };

export type Dashboard = {
  orders_by_status: Record<string, number>;
  awaiting_action: number;
  revenue_paise: number;
  orders_last_7_days: number;
  low_stock: ProductSummary[];
  out_of_stock_count: number;
  active_products: number;
  recent_orders: OrderListItem[];
};

export type ApiFieldError = { field: string; message: string };
