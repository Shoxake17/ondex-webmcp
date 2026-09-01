import "server-only";
import { cookies } from "next/headers";

import { restaurantById, dishById, menuOf } from "./catalog";
import {
  CAPABILITIES,
  DEFAULT_PERMISSIONS,
  type Capability,
  type CartLine,
  type Order,
  type Permissions,
} from "./types";

/**
 * Seans holati — SERVERDA.
 *
 * ┌─ NEGA MIJOZDA EMAS ────────────────────────────────────────────────┐
 * Ruxsatlar `localStorage` da saqlanishi mumkin edi va kod ancha
 * qisqa bo'lardi. Lekin unda ular SOZLAMA bo'lardi, ruxsat emas:
 * sahifadagi istalgan skript (yoki agentning o'zi) qiymatni
 * o'zgartirib, o'chirilgan imkoniyatni qayta yoqa olardi.
 *
 * Endi tekshiruv API yo'lining ichida. Mijoz nima yuborishidan
 * qat'i nazar, `place_order` o'chiq bo'lsa buyurtma YARATILMAYDI.
 * Bu WebMCP uchun aynan muhim: sahifaga ochilgan amallar begona
 * skriptga ham ochiq, ya'ni yagona ishonchli chegara — server.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ NEGA XOTIRADA ────────────────────────────────────────────────────┐
 * Demo uchun baza ortiqcha (repo `npm run dev` bilan ishlashi kerak).
 * Server qayta ishga tushsa holat yo'qoladi — bu demo uchun maqbul va
 * README'da aytilgan.
 * └────────────────────────────────────────────────────────────────────┘
 */

type Session = {
  cart: { restaurantId: string | null; lines: CartLine[] };
  orders: Order[];
  permissions: Permissions;
  /** Agent bajargan oxirgi amallar — "Faoliyat" sahifasi uchun. */
  activity: Array<{ at: number; tool: string; detail: string }>;
};

/**
 * ┌─ NEGA `globalThis` ─────────────────────────────────────────────────┐
 * Oddiy `const SESSIONS = new Map()` yetarli KO'RINADI, lekin ishlamaydi.
 *
 * Next.js Route Handler'larni (`app/api/...`) va Server Component'larni
 * ALOHIDA bundle'larga yig'adi. Ikkalasi ham shu modulni import qiladi
 * va modul IKKI MARTA ishga tushadi — ya'ni ikkita bir-biridan
 * bexabar `Map` paydo bo'ladi.
 *
 * Oqibati jimgina va chalg'ituvchi edi: agent `/api/cart` orqali savatga
 * qo'shadi, `/api/cart` uni ko'rsatadi, lekin `/cart` SAHIFASI bo'sh
 * turadi va `/orders/<id>` 404 qaytaradi. API to'g'ri, ekran esa yolg'on.
 *
 * `globalThis` da saqlash ikkala bundle'ni bitta nusxaga olib keladi.
 * (Bu — Next.js'da uzoq yashaydigan obyektlar uchun odatiy usul; xuddi
 * shu sabab baza ulanishlari ham shunday saqlanadi.)
 * └────────────────────────────────────────────────────────────────────┘
 */
const store = globalThis as unknown as {
  __ondexWebmcpSessions?: Map<string, Session>;
};
const SESSIONS: Map<string, Session> = (store.__ondexWebmcpSessions ??=
  new Map<string, Session>());

const COOKIE = "ondex_webmcp_sid";

/** Seansda saqlanadigan eng ko'p yozuv — xotira cheksiz o'smasin. */
const MAX_ORDERS = 20;
const MAX_ACTIVITY = 50;
/** Bir vaqtda xotirada turadigan eng ko'p seans (ochiq demo uchun). */
const MAX_SESSIONS = 500;

function blank(): Session {
  return {
    cart: { restaurantId: null, lines: [] },
    orders: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    activity: [],
  };
}

/**
 * Joriy seans. Cookie bo'lmasa yangisi yaratiladi.
 *
 * `cookies()` faqat Route Handler / Server Action ichida yozish
 * huquqiga ega, shuning uchun `readonly` rejimda ham ishlashi uchun
 * yozish urinishi `try` ichida.
 */
export async function session(): Promise<Session> {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) {
    const found = SESSIONS.get(sid);
    if (found) return found;
  }

  const fresh = blank();
  try {
    const next = crypto.randomUUID();
    jar.set(COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    prune();
    SESSIONS.set(next, fresh);
  } catch {
    // Server Component'dan o'qilganda cookie yozib bo'lmaydi.
    //
    // Bunda seansni MAP'GA QO'SHMAYMIZ: cookie'siz mijoz uni hech
    // qachon qayta topa olmaydi, ya'ni har render xotirada bitta
    // yetim yozuv qoldirardi (ochiq demoda qidiruv robotlari ham
    // shu yo'ldan o'tadi). Vaqtinchalik bo'sh holat qaytaramiz —
    // keyingi Route Handler haqiqiy seansni yaratadi.
  }
  return fresh;
}

/** Xotira cheksiz o'smasin: eng eski seanslar chiqarib tashlanadi. */
function prune() {
  if (SESSIONS.size < MAX_SESSIONS) return;
  const excess = SESSIONS.size - MAX_SESSIONS + 1;
  let i = 0;
  for (const key of SESSIONS.keys()) {
    SESSIONS.delete(key);
    if (++i >= excess) break;
  }
}

// ── Ruxsatlar ───────────────────────────────────────────────────────

export async function permissions(): Promise<Permissions> {
  return (await session()).permissions;
}

export async function setPermission(
  name: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!(CAPABILITIES as readonly string[]).includes(name)) {
    return { ok: false, error: "unknown capability" };
  }
  const s = await session();
  s.permissions[name as Capability] = enabled;
  return { ok: true };
}

/** Ruxsat bormi. API yo'llari HAR BIRI shuni chaqiradi. */
export async function allowed(cap: Capability): Promise<boolean> {
  return (await session()).permissions[cap];
}

// ── Faoliyat jurnali ────────────────────────────────────────────────

export async function logActivity(tool: string, detail: string) {
  const s = await session();
  s.activity.unshift({ at: Date.now(), tool, detail });
  if (s.activity.length > MAX_ACTIVITY) s.activity.length = MAX_ACTIVITY;
}

export async function activity() {
  return (await session()).activity;
}

// ── Savat ───────────────────────────────────────────────────────────

export async function cart() {
  return (await session()).cart;
}

export async function addToCart(
  dishId: string,
  qty: number,
): Promise<{ ok: boolean; error?: string; switched?: boolean; name?: string }> {
  const dish = dishById(dishId);
  // ★ ID SERVERDA TEKSHIRILADI. Agent ID to'qishi mumkin va
  // tekshiruvsiz savatga mavjud bo'lmagan taom tushardi.
  if (!dish) return { ok: false, error: "no such dish" };
  if (!dish.available) return { ok: false, error: "dish is not available" };

  const rest = restaurantById(dish.restaurantId);
  if (!rest?.open) return { ok: false, error: "restaurant is closed" };

  const s = await session();
  // Bitta buyurtma = bitta restoran.
  const switched =
    s.cart.restaurantId !== null && s.cart.restaurantId !== dish.restaurantId;
  if (switched) s.cart.lines = [];
  s.cart.restaurantId = dish.restaurantId;

  const line = s.cart.lines.find((l) => l.dishId === dishId);
  const next = Math.min((line?.qty ?? 0) + qty, 20);
  if (line) line.qty = next;
  else s.cart.lines.push({ dishId, qty: next });

  return { ok: true, switched, name: dish.name };
}

export async function setCartQty(dishId: string, qty: number) {
  const s = await session();
  if (qty <= 0) {
    s.cart.lines = s.cart.lines.filter((l) => l.dishId !== dishId);
    if (s.cart.lines.length === 0) s.cart.restaurantId = null;
    return;
  }
  const line = s.cart.lines.find((l) => l.dishId === dishId);
  if (line) line.qty = Math.min(qty, 20);
}

export async function clearCart() {
  const s = await session();
  s.cart = { restaurantId: null, lines: [] };
}

/**
 * Savat summasi — HAR DOIM shu yerda hisoblanadi.
 *
 * Mijoz tomonda hisoblansa yetkazib berish narxi hisobga olinmay,
 * agent noto'g'ri summa aytardi.
 */
export async function cartTotal(): Promise<{
  items: Array<{ dishId: string; name: string; qty: number; priceTiyin: number }>;
  subtotalTiyin: number;
  deliveryTiyin: number;
  totalTiyin: number;
  restaurantName: string | null;
}> {
  const s = await session();
  const items = s.cart.lines.flatMap((l) => {
    const dish = dishById(l.dishId);
    if (!dish) return [];
    return [{ dishId: l.dishId, name: dish.name, qty: l.qty, priceTiyin: dish.priceTiyin }];
  });
  const subtotalTiyin = items.reduce((a, i) => a + i.priceTiyin * i.qty, 0);
  const rest = s.cart.restaurantId ? restaurantById(s.cart.restaurantId) : undefined;
  const deliveryTiyin = items.length > 0 && rest ? rest.deliveryTiyin : 0;
  return {
    items,
    subtotalTiyin,
    deliveryTiyin,
    totalTiyin: subtotalTiyin + deliveryTiyin,
    restaurantName: rest?.name ?? null,
  };
}

// ── Buyurtmalar ─────────────────────────────────────────────────────

export async function placeOrder(
  paymentMethod: "cash" | "card",
  placedBy: "human" | "agent",
): Promise<{
  ok: boolean;
  error?: string;
  /** `forbidden` — ruxsat yo'q; `invalid` — holat noto'g'ri (savat bo'sh). */
  code?: "forbidden" | "invalid";
  order?: Order;
}> {
  const s = await session();

  // ┌─ RUXSAT BIRINCHI, HOLAT KEYIN ─────────────────────────────────┐
  // Avval savatni tekshirgan edik va bo'sh savatda agent "savat
  // bo'sh" javobini olardi — ya'ni ruxsati yo'qligini BILMAY qolardi
  // va uni sinab ko'rish uchun avval savatni to'ldirardi.
  //
  // Muhimrog'i: har qanday tekshiruvdan oldin turgan kod kelajakda
  // holatga tegib qo'yishi mumkin. Chegara eng birinchi bo'lsin.
  // └────────────────────────────────────────────────────────────────┘

  // ★ AGENT UCHUN QO'SHIMCHA CHEGARA. Odam tugmani bosganda ruxsat
  // so'ralmaydi — bu uning o'z ilovasi. Agent uchun esa `place_order`
  // ruxsati SHART va u sukut bo'yicha o'chiq.
  if (placedBy === "agent" && !s.permissions.place_order) {
    return {
      ok: false,
      code: "forbidden",
      error: "the agent is not allowed to place orders",
    };
  }
  // ★ KARTA — FAQAT ODAM. Karta to'lovi bank sahifasida tasdiq
  // talab qiladi; uni agent bajara olmaydi va bajarmasligi kerak.
  if (placedBy === "agent" && paymentMethod === "card") {
    return {
      ok: false,
      code: "forbidden",
      error: "the agent may only place cash orders",
    };
  }

  const total = await cartTotal();
  if (total.items.length === 0 || !s.cart.restaurantId) {
    return { ok: false, code: "invalid", error: "cart is empty" };
  }

  const rest = restaurantById(s.cart.restaurantId);
  const id = crypto.randomUUID().slice(0, 8);
  const order: Order = {
    id,
    number: `${new Date().toISOString().slice(5, 10).replace("-", "")}-${id.slice(0, 4)}`,
    restaurantId: s.cart.restaurantId,
    restaurantName: rest?.name ?? "restaurant",
    lines: total.items.map((i) => ({ name: i.name, qty: i.qty, priceTiyin: i.priceTiyin })),
    totalTiyin: total.totalTiyin,
    paymentMethod,
    status: "placed",
    placedBy,
    createdAt: Date.now(),
  };
  s.orders.unshift(order);
  if (s.orders.length > MAX_ORDERS) s.orders.length = MAX_ORDERS;
  s.cart = { restaurantId: null, lines: [] };
  return { ok: true, order };
}

export async function orders(): Promise<Order[]> {
  return (await session()).orders;
}

export async function orderById(id: string): Promise<Order | undefined> {
  return (await session()).orders.find((o) => o.id === id);
}

export { menuOf };
