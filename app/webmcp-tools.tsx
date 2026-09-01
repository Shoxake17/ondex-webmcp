"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { api, lines, registerTools, sum } from "@/lib/webmcp";
import type { Dish, Order, Restaurant } from "@/lib/types";
import { useAgentBar } from "./agent-bar";

type CartView = {
  items: Array<{ dishId: string; name: string; qty: number; priceTiyin: number }>;
  subtotalTiyin: number;
  deliveryTiyin: number;
  totalTiyin: number;
  restaurantName: string | null;
  switched?: boolean;
};

/**
 * OnDex amallarini agentga ochadi.
 *
 * ┌─ NEGA AYNAN BU AMALLAR ────────────────────────────────────────────┐
 * Ro'yxat ATAYLAB kalta va odamning haqiqiy yo'liga mos: qidir →
 * menyu → savat → rasmiylashtirish → buyurtma → kuzatuv. Har bir
 * qo'shimcha amal — kengaygan hujum yuzasi va agentning chalkashish
 * ehtimoli.
 *
 * Ro'yxatda YO'Q narsalar ham ataylab: ruxsatlarni o'zgartirish,
 * profil tahriri, to'lov usulini almashtirish. Agent o'ziga huquq
 * bera olmasligi kerak.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ HAR AMAL EKRANDA KO'RINADI ───────────────────────────────────────┐
 * Amallar sahifani haqiqatan boshqaradi (menyu ochiladi, savatga
 * o'tiladi) va tepadagi lentaga yoziladi. Pul sarflaydigan oqimda
 * odam nima bo'layotganini ko'rishi shart.
 * └────────────────────────────────────────────────────────────────────┘
 */
export default function WebMcpTools() {
  const router = useRouter();
  const bar = useAgentBar();

  useEffect(() => {
    const say = bar.push;
    // Sahifa ma'lumotini yangilash — agent o'zgartirgani darhol
    // ko'rinsin (savatdagi son, buyurtmalar ro'yxati).
    const refresh = () => router.refresh();

    return registerTools([
      {
        name: "search_dishes",
        description:
          "Search dishes across all OnDex restaurants by name or category " +
          "(for example 'osh', 'burger', 'coffee'). Returns dish ids that " +
          "add_to_cart needs. Always search before adding — never invent ids.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        execute: async (input) => {
          const q = String(input.query ?? "").trim();
          if (!q) return "The query is empty.";
          say(`Searching "${q}"`);
          const r = await api<{
            dishes: Array<Dish & { restaurantName: string; restaurantOpen: boolean }>;
          }>(`/api/catalog?q=${encodeURIComponent(q)}`);
          if (!r.ok) return `Search failed: ${r.error}`;
          const found = r.data.dishes.slice(0, 10);
          if (found.length === 0) return `Nothing found for "${q}".`;
          return lines(
            `Found ${found.length} dish(es):`,
            ...found.map(
              (d) =>
                `- ${d.name} — ${sum(d.priceTiyin)} at ${d.restaurantName}` +
                `${d.restaurantOpen ? "" : " (closed now)"}` +
                ` [dish_id=${d.id}, restaurant_id=${d.restaurantId}]`,
            ),
          );
        },
      },

      {
        name: "list_restaurants",
        description: "List OnDex restaurants with open/closed state and ids.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          say("Loading restaurants");
          const r = await api<{ restaurants: Restaurant[] }>("/api/catalog");
          if (!r.ok) return `Could not load restaurants: ${r.error}`;
          return lines(
            `${r.data.restaurants.length} restaurant(s):`,
            ...r.data.restaurants.map(
              (x) =>
                `- ${x.name} (${x.tags})${x.open ? "" : " — closed"}, delivery ${sum(
                  x.deliveryTiyin,
                )}, ~${x.etaMinutes} min [restaurant_id=${x.id}]`,
            ),
          );
        },
      },

      {
        name: "open_menu",
        description:
          "Open a restaurant's menu page on the user's screen and return " +
          "its dishes. Use a restaurant_id from search_dishes or list_restaurants.",
        inputSchema: {
          type: "object",
          properties: { restaurant_id: { type: "string" } },
          required: ["restaurant_id"],
        },
        execute: async (input) => {
          const id = String(input.restaurant_id ?? "").trim();
          if (!id) return "restaurant_id is empty.";
          const r = await api<{ restaurant: Restaurant; menu: Dish[] }>(
            `/api/catalog?restaurant=${encodeURIComponent(id)}`,
          );
          if (!r.ok) return `Could not open the menu: ${r.error}`;
          say(`Opening ${r.data.restaurant.name}`);
          router.push(`/restaurants/${encodeURIComponent(id)}`);
          return lines(
            `${r.data.restaurant.name} — ${r.data.menu.length} dishes:`,
            ...r.data.menu.map(
              (d) => `- ${d.name} — ${sum(d.priceTiyin)} [dish_id=${d.id}]`,
            ),
          );
        },
      },

      {
        name: "add_to_cart",
        description:
          "Add a dish to the cart by dish_id. One order = one restaurant: " +
          "adding a dish from another restaurant clears the cart first. " +
          "This does NOT place an order.",
        inputSchema: {
          type: "object",
          properties: {
            dish_id: { type: "string" },
            quantity: { type: "integer", minimum: 1, maximum: 20 },
          },
          required: ["dish_id"],
        },
        execute: async (input) => {
          const dishId = String(input.dish_id ?? "").trim();
          const qty = Number(input.quantity ?? 1) || 1;
          if (!dishId) return "dish_id is empty.";

          const r = await api<CartView>("/api/cart", {
            method: "POST",
            body: JSON.stringify({ dishId, qty }),
          });
          if (!r.ok) return `Could not add the dish: ${r.error}`;

          say(`Added to cart (${qty})`);
          refresh();
          return lines(
            r.data.switched === true &&
              "Note: the cart had dishes from another restaurant, so it was cleared.",
            `Cart: ${r.data.items.length} item type(s), total ${sum(r.data.totalTiyin)}.`,
          );
        },
      },

      {
        name: "view_cart",
        description:
          "Show the current cart with the server-calculated total " +
          "(delivery included).",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const r = await api<CartView>("/api/cart");
          if (!r.ok) return `Could not read the cart: ${r.error}`;
          if (r.data.items.length === 0) return "The cart is empty.";
          return lines(
            `Cart (${r.data.restaurantName}):`,
            ...r.data.items.map((i) => `- ${i.name} x${i.qty} — ${sum(i.priceTiyin * i.qty)}`),
            `Delivery: ${sum(r.data.deliveryTiyin)}`,
            `Total: ${sum(r.data.totalTiyin)}`,
          );
        },
      },

      {
        name: "open_checkout",
        description:
          "Open the checkout page so the user can review and confirm. " +
          "This does NOT place the order.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const r = await api<CartView>("/api/cart");
          if (!r.ok) return `Could not read the cart: ${r.error}`;
          if (r.data.items.length === 0) {
            return "The cart is empty — add dishes first.";
          }
          say("Opening checkout");
          router.push("/checkout");
          return lines(
            `Checkout is open. Total ${sum(r.data.totalTiyin)}.`,
            "Ask the user whether to place the order with cash payment. If they agree, call place_order.",
          );
        },
      },

      {
        name: "place_order",
        description:
          "Place the order with CASH payment after the user has clearly " +
          "agreed out loud or in writing. Card payment is never available " +
          "to the agent — the user pays for card orders themselves. " +
          "Requires the 'place_order' permission, which is OFF by default.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          say("Placing the order");
          const r = await api<{ order: Order }>("/api/orders", {
            method: "POST",
            body: JSON.stringify({ paymentMethod: "cash" }),
          });
          if (!r.ok) {
            // Ruxsat yo'q — bu XATO emas, foydalanuvchining qarori.
            // Agentga aynan shunday tushuntiriladi, aks holda u
            // qayta-qayta urinaverardi.
            return lines(
              `The order was not placed: ${r.error}.`,
              "Tell the user they can either press the confirm button themselves, or enable 'Place orders' on the Permissions page.",
            );
          }
          refresh();
          router.push(`/orders/${r.data.order.id}`);
          return `Order ${r.data.order.number} placed at ${r.data.order.restaurantName}, total ${sum(
            r.data.order.totalTiyin,
          )}, cash on delivery.`;
        },
      },

      {
        name: "my_orders",
        description: "List recent orders with restaurant, status and total.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const r = await api<{ orders: Order[] }>("/api/orders");
          if (!r.ok) return `Could not load orders: ${r.error}`;
          if (r.data.orders.length === 0) return "No orders yet.";
          say("Loading orders");
          return lines(
            `${r.data.orders.length} order(s):`,
            ...r.data.orders.map(
              (o) =>
                `- ${o.restaurantName} — ${sum(o.totalTiyin)}, ${o.status}` +
                ` (${o.placedBy === "agent" ? "placed by agent" : "placed by user"})` +
                ` [order_id=${o.id}, number=${o.number}]`,
            ),
          );
        },
      },

      {
        name: "track_order",
        description: "Open an order page and return its current status.",
        inputSchema: {
          type: "object",
          properties: { order_id: { type: "string" } },
          required: ["order_id"],
        },
        execute: async (input) => {
          const id = String(input.order_id ?? "").trim();
          if (!id) return "order_id is empty.";
          const r = await api<{ order: Order }>(
            `/api/orders/${encodeURIComponent(id)}`,
          );
          if (!r.ok) return `Could not load the order: ${r.error}`;
          say("Opening the order");
          router.push(`/orders/${encodeURIComponent(id)}`);
          return `Order ${r.data.order.number}: ${r.data.order.status}, total ${sum(
            r.data.order.totalTiyin,
          )}.`;
        },
      },
    ]);
  }, [router, bar.push]);

  return null;
}
