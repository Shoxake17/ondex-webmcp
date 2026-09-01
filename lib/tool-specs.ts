import type { Capability } from "./types";

/**
 * Amallarning TA'RIFI — bajarilishisiz.
 *
 * ┌─ NEGA BAJARILISHIDAN AJRATILGAN ───────────────────────────────────┐
 * Ta'riflar ikki joyda kerak bo'ladi:
 *
 *   brauzer — WebMCP'ga ro'yxatga olish va amalni BAJARISH
 *   server  — Gemini tokeni ichida amallar ro'yxatini QULFLASH
 *
 * Bajarish kodi brauzerga bog'liq (sahifani almashtiradi, savatni
 * yangilaydi), shuning uchun uni serverga olib chiqib bo'lmaydi.
 * Ta'rif esa oddiy ma'lumot va ikkalasiga ham yaraydi.
 *
 * Ro'yxatni ikki joyda yozish eng oson yo'l bo'lardi va eng yomoni
 * ham: ular vaqt o'tib bir-biridan uzoqlashadi, va model mavjud
 * bo'lmagan amalni chaqirib, sababi tushunarsiz xato beradi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export type ToolSpec = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  capability: Capability;
};

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "search_dishes",
    capability: "browse",
    description:
      "Search dishes across all OnDex restaurants by name or category " +
      "(for example 'osh', 'burger', 'coffee'). Returns dish ids that " +
      "add_to_cart needs. Always search before adding — never invent ids.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "list_restaurants",
    capability: "browse",
    description: "List OnDex restaurants with open/closed state and ids.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "open_menu",
    capability: "browse",
    description:
      "Open a restaurant's menu page on the user's screen and return " +
      "its dishes. Use a restaurant_id from search_dishes or list_restaurants.",
    inputSchema: {
      type: "object",
      properties: { restaurant_id: { type: "string" } },
      required: ["restaurant_id"],
    },
  },
  {
    name: "add_to_cart",
    capability: "cart",
    description:
      "Add a dish to the cart by dish_id. Pass quantity when the user " +
      'asks for more than one ("add two" means quantity: 2) — it ' +
      "defaults to 1 otherwise. One order = one restaurant: adding a " +
      "dish from another restaurant clears the cart first. " +
      "This does NOT place an order.",
    inputSchema: {
      type: "object",
      properties: {
        dish_id: { type: "string" },
        quantity: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "How many to add. Defaults to 1.",
        },
      },
      required: ["dish_id"],
    },
  },
  {
    name: "view_cart",
    capability: "cart",
    description:
      "Show the current cart with the server-calculated total " +
      "(delivery included).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "open_checkout",
    capability: "checkout",
    description:
      "Open the checkout page so the user can review and confirm. " +
      "This does NOT place the order.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "place_order",
    capability: "place_order",
    description:
      "Place the order with CASH payment after the user has clearly " +
      "agreed out loud or in writing. Card payment is never available " +
      "to the agent — the user pays for card orders themselves. " +
      "Requires the 'place_order' permission, which is OFF by default.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "my_orders",
    capability: "orders",
    description: "List recent orders with restaurant, status and total.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "track_order",
    capability: "orders",
    description: "Open an order page and return its current status.",
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string" } },
      required: ["order_id"],
    },
  },
];

/**
 * JSON Schema -> Gemini sxemasi.
 *
 * Gemini tur nomlarini KATTA harfda kutadi ("OBJECT", "STRING").
 * Argumentsiz amallarda `parameters` umuman yuborilmaydi: bo'sh
 * `properties` bilan e'lon ba'zan rad etiladi.
 */
export function geminiFunctionDeclarations() {
  return TOOL_SPECS.map((t) => {
    const props = (t.inputSchema.properties ?? {}) as Record<string, unknown>;
    return {
      name: t.name,
      description: t.description,
      ...(Object.keys(props).length === 0
        ? {}
        : { parameters: upperCaseTypes(t.inputSchema) }),
    };
  });
}

function upperCaseTypes(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(upperCaseTypes);
  if (typeof node !== "object" || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    out[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : upperCaseTypes(v);
  }
  return out;
}
