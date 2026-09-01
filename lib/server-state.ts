import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

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
 * Seans holati — IMZOLANGAN COOKIE ichida.
 *
 * ┌─ NEGA XOTIRADA EMAS ───────────────────────────────────────────────┐
 * Avval holat serverning xotirasida (`Map`) turardi. Lokalda ishladi,
 * jonli serverda esa yo'q — va buni faqat o'lchov ko'rsatdi:
 *
 *   /api/cart  -> savatda 1 element
 *   /cart      -> savat BO'SH
 *
 * Sababi Vercel'da har bir yo'l alohida serverless funksiya, Server
 * Component'lar esa Route Handler'lardan butunlay boshqa muhitda
 * ishlaydi. Umumiy xotira degan narsa yo'q. Natijada ekran agent
 * ortidan ergashmasdi va buyurtma tasodifan rad etilardi.
 *
 * Cookie bu muammoni tugatadi: holat foydalanuvchi bilan birga
 * yuradi, qaysi funksiya javob berishidan qat'i nazar.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ NEGA IMZOLANADI ──────────────────────────────────────────────────┐
 * Cookie'da RUXSATLAR ham bor. Imzosiz uni o'zgartirib, `place_order`
 * ni yoqib qo'yish mumkin bo'lardi — ya'ni loyihaning butun da'vosi
 * ("tekshiruv serverda") yolg'onga aylanardi.
 *
 * Endi server har o'qishda HMAC'ni tekshiradi va buzilgan qiymatni
 * qabul qilmaydi: u shunchaki yangi, sukut bo'yicha holatga aylanadi.
 * Cookie `httpOnly` ham — sahifadagi skript (agentning o'zi ham) unga
 * umuman tegа olmaydi.
 * └────────────────────────────────────────────────────────────────────┘
 */

export type State = {
  /** Savat: restoran va qatorlar. */
  cart: { restaurantId: string | null; lines: CartLine[] };
  orders: Order[];
  permissions: Permissions;
  /** Agent bajargan oxirgi amallar — ruxsatlar sahifasi uchun. */
  activity: Array<{ at: number; tool: string; detail: string }>;
};

const COOKIE = "ondex_webmcp_state";

/**
 * Cookie'da 4096 baytdan ko'p saqlab bo'lmaydi, shuning uchun
 * ro'yxatlar qisqa. Chegaraga yetganda eng eskisi tashlanadi.
 */
const MAX_ORDERS = 5;
const MAX_ACTIVITY = 10;
const MAX_COOKIE_BYTES = 3800;

/**
 * Imzo kaliti.
 *
 * `SESSION_SECRET` berilmasa demo baribir ishlaydi — repo'ni klonlagan
 * odam hech narsa sozlamasdan `npm run dev` qila olishi kerak. Bu
 * demoda shaxsiy ma'lumot ham, pul ham yo'q; cookie `httpOnly`
 * bo'lgani uchun sahifadagi skript unga baribir tegolmaydi.
 * Haqiqiy o'rnatishda o'zgaruvchini qo'yish kerak — README'da yozilgan.
 */
const SECRET = process.env.SESSION_SECRET ?? "ondex-webmcp-public-demo-key";

// ── Cookie'ni imzolash va tekshirish ────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/**
 * Imzolarni SOLISHTIRISHDA `timingSafeEqual`.
 *
 * Oddiy `===` solishtirish qancha belgi mos kelganini vaqt orqali
 * bildirib qo'yadi va imzoni belgima-belgi topish yo'lini ochadi.
 */
function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function blank(): State {
  return {
    cart: { restaurantId: null, lines: [] },
    orders: [],
    permissions: { ...DEFAULT_PERMISSIONS },
    activity: [],
  };
}

/**
 * Buzilgan yoki yetishmayotgan maydonlarni to'g'rilaydi.
 *
 * Cookie tashqi dunyodan keladi — imzo to'g'ri bo'lsa ham (masalan
 * eski versiyadan qolgan bo'lsa) shakli kutilganidan farq qilishi
 * mumkin. Ishonmasdan qayta yig'amiz.
 */
function revive(raw: unknown): State {
  const s = blank();
  if (typeof raw !== "object" || raw === null) return s;
  const o = raw as Partial<State>;

  if (o.cart && typeof o.cart === "object" && Array.isArray(o.cart.lines)) {
    s.cart.restaurantId =
      typeof o.cart.restaurantId === "string" ? o.cart.restaurantId : null;
    s.cart.lines = o.cart.lines
      .filter(
        (l): l is CartLine =>
          !!l && typeof l.dishId === "string" && Number.isFinite(l.qty),
      )
      .map((l) => ({ dishId: l.dishId, qty: Math.min(Math.max(1, l.qty), 20) }));
  }
  if (Array.isArray(o.orders)) s.orders = o.orders.slice(0, MAX_ORDERS);
  if (Array.isArray(o.activity)) s.activity = o.activity.slice(0, MAX_ACTIVITY);
  if (o.permissions && typeof o.permissions === "object") {
    for (const cap of CAPABILITIES) {
      if (typeof o.permissions[cap] === "boolean") {
        s.permissions[cap] = o.permissions[cap];
      }
    }
  }
  return s;
}

/**
 * Joriy holatni o'qiydi.
 *
 * HAR SO'ROVDA BIR MARTA chaqiring va natijani uzating. Ikki marta
 * o'qib, ikki marta yozish oxirgi yozuvning oldingisini o'chirishiga
 * olib keladi — cookie butunlay qayta yoziladi, qo'shimcha qilinmaydi.
 */
export async function loadState(): Promise<State> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return blank();

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return blank();

  const payload = raw.slice(0, dot);
  if (!verify(payload, raw.slice(dot + 1))) {
    // Qalbakilashtirilgan yoki boshqa kalit bilan imzolangan — e'tiborsiz
    // qoldiramiz va toza holatdan boshlaymiz.
    return blank();
  }
  try {
    return revive(JSON.parse(Buffer.from(payload, "base64url").toString()));
  } catch {
    return blank();
  }
}

/**
 * Holatni cookie'ga yozadi.
 *
 * Faqat Route Handler va Server Action'da ishlaydi — Server Component
 * cookie yoza olmaydi va istisno tashlaydi. Sahifalar holatni faqat
 * O'QIYDI, shuning uchun bu yerda istisnoni yutish to'g'ri.
 */
export async function saveState(state: State): Promise<void> {
  state.orders = state.orders.slice(0, MAX_ORDERS);
  state.activity = state.activity.slice(0, MAX_ACTIVITY);

  let value = encode(state);
  // Cookie chegarasidan oshsa eng eski yozuvlarni tashlaymiz. Jurnal
  // avval ketadi: buyurtmalar foydalanuvchiga muhimroq.
  while (value.length > MAX_COOKIE_BYTES) {
    if (state.activity.length > 0) state.activity.pop();
    else if (state.orders.length > 1) state.orders.pop();
    else break;
    value = encode(state);
  }

  try {
    (await cookies()).set(COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      // ★ `secure` NODE_ENV bo'yicha emas, ULANISH bo'yicha.
      //
      // `next start` NODE_ENV ni "production" qiladi, ya'ni lokal
      // `http://localhost` da ham `secure: true` qo'yilardi — va
      // brauzer bunday cookie'ni HTTP ustida saqlamaydi. Natijada
      // holat butunlay yo'qolardi va sababi ko'rinmasdi.
      secure: await isHttps(),
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  } catch {
    // Server Component'dan chaqirilgan — yozish mumkin emas, me'yor.
  }
}

/** So'rov HTTPS orqali kelganmi (Vercel proksi sarlavhasi bo'yicha). */
async function isHttps(): Promise<boolean> {
  try {
    return (await headers()).get("x-forwarded-proto") === "https";
  } catch {
    return false;
  }
}

function encode(state: State): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// ── Ruxsatlar ───────────────────────────────────────────────────────

export function permissionsOf(state: State): Permissions {
  return state.permissions;
}

export function setPermission(
  state: State,
  name: string,
  enabled: boolean,
): { ok: boolean; error?: string } {
  if (!(CAPABILITIES as readonly string[]).includes(name)) {
    return { ok: false, error: "unknown capability" };
  }
  state.permissions[name as Capability] = enabled;
  return { ok: true };
}

/** Ruxsat bormi. API yo'llari HAR BIRI shuni chaqiradi. */
export function allowed(state: State, cap: Capability): boolean {
  return state.permissions[cap];
}

// ── Faoliyat jurnali ────────────────────────────────────────────────

export function logActivity(state: State, tool: string, detail: string) {
  state.activity.unshift({ at: Date.now(), tool, detail: detail.slice(0, 80) });
  if (state.activity.length > MAX_ACTIVITY) state.activity.length = MAX_ACTIVITY;
}

// ── Savat ───────────────────────────────────────────────────────────

export function addToCart(
  state: State,
  dishId: string,
  qty: number,
): { ok: boolean; error?: string; switched?: boolean; name?: string } {
  const dish = dishById(dishId);
  // ★ ID SERVERDA TEKSHIRILADI. Agent ID to'qishi mumkin va
  // tekshiruvsiz savatga mavjud bo'lmagan taom tushardi.
  if (!dish) return { ok: false, error: "no such dish" };
  if (!dish.available) return { ok: false, error: "dish is not available" };

  const rest = restaurantById(dish.restaurantId);
  if (!rest?.open) return { ok: false, error: "restaurant is closed" };

  // Bitta buyurtma = bitta restoran.
  const switched =
    state.cart.restaurantId !== null &&
    state.cart.restaurantId !== dish.restaurantId;
  if (switched) state.cart.lines = [];
  state.cart.restaurantId = dish.restaurantId;

  const line = state.cart.lines.find((l) => l.dishId === dishId);
  const next = Math.min((line?.qty ?? 0) + qty, 20);
  if (line) line.qty = next;
  else state.cart.lines.push({ dishId, qty: next });

  return { ok: true, switched, name: dish.name };
}

export function setCartQty(state: State, dishId: string, qty: number) {
  if (qty <= 0) {
    state.cart.lines = state.cart.lines.filter((l) => l.dishId !== dishId);
    if (state.cart.lines.length === 0) state.cart.restaurantId = null;
    return;
  }
  const line = state.cart.lines.find((l) => l.dishId === dishId);
  if (line) line.qty = Math.min(qty, 20);
}

export function clearCart(state: State) {
  state.cart = { restaurantId: null, lines: [] };
}

/**
 * Savat summasi — HAR DOIM shu yerda hisoblanadi.
 *
 * Narx cookie'dan OLINMAYDI, katalogdan qidiriladi: cookie imzolangan
 * bo'lsa ham, narxni holatda saqlash uni bir kun kelib mijoz
 * boshqaradigan qiymatga aylantirardi.
 */
export function cartTotal(state: State): {
  items: Array<{ dishId: string; name: string; qty: number; priceTiyin: number }>;
  subtotalTiyin: number;
  deliveryTiyin: number;
  totalTiyin: number;
  restaurantName: string | null;
} {
  const items = state.cart.lines.flatMap((l) => {
    const dish = dishById(l.dishId);
    if (!dish) return [];
    return [
      { dishId: l.dishId, name: dish.name, qty: l.qty, priceTiyin: dish.priceTiyin },
    ];
  });
  const subtotalTiyin = items.reduce((a, i) => a + i.priceTiyin * i.qty, 0);
  const rest = state.cart.restaurantId
    ? restaurantById(state.cart.restaurantId)
    : undefined;
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

export function placeOrder(
  state: State,
  paymentMethod: "cash" | "card",
  placedBy: "human" | "agent",
): {
  ok: boolean;
  error?: string;
  /** `forbidden` — ruxsat yo'q; `invalid` — holat noto'g'ri (savat bo'sh). */
  code?: "forbidden" | "invalid";
  order?: Order;
} {
  // ┌─ RUXSAT BIRINCHI, HOLAT KEYIN ─────────────────────────────────┐
  // Avval savatni tekshirgan edik va bo'sh savatda agent "savat
  // bo'sh" javobini olardi — ya'ni ruxsati yo'qligini BILMAY qolardi.
  // Chegara eng birinchi bo'lsin.
  // └────────────────────────────────────────────────────────────────┘

  // ★ AGENT UCHUN QO'SHIMCHA CHEGARA. Odam tugmani bosganda ruxsat
  // so'ralmaydi — bu uning o'z ilovasi. Agent uchun esa `place_order`
  // ruxsati SHART va u sukut bo'yicha o'chiq.
  if (placedBy === "agent" && !state.permissions.place_order) {
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

  const total = cartTotal(state);
  if (total.items.length === 0 || !state.cart.restaurantId) {
    return { ok: false, code: "invalid", error: "cart is empty" };
  }

  const rest = restaurantById(state.cart.restaurantId);
  const id = crypto.randomUUID().slice(0, 8);
  const order: Order = {
    id,
    number: `${new Date().toISOString().slice(5, 10).replace("-", "")}-${id.slice(0, 4)}`,
    restaurantId: state.cart.restaurantId,
    restaurantName: rest?.name ?? "restaurant",
    lines: total.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      priceTiyin: i.priceTiyin,
    })),
    totalTiyin: total.totalTiyin,
    paymentMethod,
    status: "placed",
    placedBy,
    createdAt: Date.now(),
  };
  state.orders.unshift(order);
  if (state.orders.length > MAX_ORDERS) state.orders.length = MAX_ORDERS;
  state.cart = { restaurantId: null, lines: [] };
  return { ok: true, order };
}

export function orderById(state: State, id: string): Order | undefined {
  return state.orders.find((o) => o.id === id);
}

export { menuOf };
