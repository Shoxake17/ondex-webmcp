export type Restaurant = {
  id: string;
  name: string;
  tags: string;
  open: boolean;
  etaMinutes: number;
  deliveryTiyin: number;
};

export type Dish = {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  priceTiyin: number;
  available: boolean;
  description: string;
};

export type CartLine = { dishId: string; qty: number };

export type Order = {
  id: string;
  number: string;
  restaurantId: string;
  restaurantName: string;
  lines: Array<{ name: string; qty: number; priceTiyin: number }>;
  totalTiyin: number;
  paymentMethod: "cash" | "card";
  status: "placed" | "cooking" | "on_the_way" | "delivered";
  placedBy: "human" | "agent";
  createdAt: number;
};

/**
 * Agentga berilishi mumkin bo'lgan imkoniyatlar.
 *
 * ┌─ NEGA "O'CHIRILGANLAR" EMAS, HAMMASI SANALADI ─────────────────────┐
 * Ro'yxat qat'iy: mijoz yubormagan nom qabul qilinmaydi. Shu bilan
 * sahifadagi skript o'ziga yangi imkoniyat "ixtiro qila" olmaydi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export const CAPABILITIES = [
  "browse", // qidirish, ro'yxat, menyu
  "cart", // savatga qo'shish/olib tashlash
  "checkout", // rasmiylashtirish ekraniga olib borish
  "place_order", // buyurtmani O'ZI berish (naqd)
  "orders", // buyurtmalarni ko'rish va kuzatish
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type Permissions = Record<Capability, boolean>;

/**
 * Sukut bo'yicha holat.
 *
 * `place_order` ATAYLAB o'chiq: agent birinchi ochilishdayoq pul
 * sarflaydigan amalni bajara olmasligi kerak. Qolganlari yoqilgan —
 * ular faqat o'qish va savat, ya'ni qaytarib bo'ladigan amallar.
 */
export const DEFAULT_PERMISSIONS: Permissions = {
  browse: true,
  cart: true,
  checkout: true,
  place_order: false,
  orders: true,
};

/**
 * Qaysi amal qaysi imkoniyatga tegishli.
 *
 * ┌─ NEGA ALOHIDA JADVAL ──────────────────────────────────────────────┐
 * Buni amal ta'rifining ichiga yozish mumkin edi, lekin u obyekt
 * `registerTool` ga o'zgarishsiz uzatiladi — spetsifikatsiyada yo'q
 * maydon qo'shish xavfli (qat'iy amalga oshirish uni rad etishi
 * mumkin). Shuning uchun bog'lanish tashqarida turadi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Bu jadval faqat KO'RSATISH uchun (`/agent` sahifasi). Haqiqiy
 * tekshiruv baribir API yo'lining ichida — u yerda yagona manba.
 */
export const TOOL_CAPABILITY: Record<string, Capability> = {
  search_dishes: "browse",
  list_restaurants: "browse",
  open_menu: "browse",
  add_to_cart: "cart",
  view_cart: "cart",
  open_checkout: "checkout",
  place_order: "place_order",
  my_orders: "orders",
  track_order: "orders",
};
