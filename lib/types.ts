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
