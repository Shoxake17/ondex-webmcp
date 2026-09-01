import { NextResponse } from "next/server";

import {
  allowed,
  loadState,
  logActivity,
  placeOrder,
  saveState,
} from "@/lib/server-state";

export async function GET() {
  const state = await loadState();
  if (!allowed(state, "orders")) {
    return NextResponse.json(
      { error: "order history is turned off in permissions" },
      { status: 403 },
    );
  }
  return NextResponse.json({ orders: state.orders });
}

/**
 * Buyurtma berish.
 *
 * ┌─ KIM BERAYOTGANI MUHIM ────────────────────────────────────────────┐
 * `placedBy` mijozdan KELMAYDI. Bu yo'lga tushgan har qanday so'rov
 * `agent` deb belgilanadi — ya'ni standart holat qattiqroq tomonda:
 * noma'lum manba agent deb qaraladi va `place_order` ruxsatisiz
 * o'tmaydi.
 *
 * "Odam" deb hisoblanish uchun so'rov sahifadagi forma orqali, Server
 * Action bilan kelishi kerak (`app/checkout/actions.ts`) — u umuman
 * shu yo'ldan o'tmaydi va agent uni chaqira olmaydi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function POST(req: Request) {
  let body: { paymentMethod?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const method = body.paymentMethod === "card" ? "card" : "cash";

  const state = await loadState();
  const res = placeOrder(state, method, "agent");
  if (!res.ok) {
    logActivity(state, "place_order", res.error ?? "refused", true);
    await saveState(state);
    // Ruxsat yo'qligi (403) va holat noto'g'riligi (400) farqlanadi:
    // agent birinchisida qayta urinmasligi, ikkinchisida esa avval
    // savatni to'ldirishi kerakligini tushunsin.
    return NextResponse.json(
      { error: res.error },
      { status: res.code === "invalid" ? 400 : 403 },
    );
  }
  logActivity(
    state,
    "place_order",
    `${res.order?.restaurantName} — ${res.order?.number}`,
  );
  await saveState(state);
  return NextResponse.json({ order: res.order });
}
