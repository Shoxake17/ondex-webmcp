import { NextResponse } from "next/server";

import { allowed, logActivity, orders, placeOrder } from "@/lib/server-state";

export async function GET() {
  if (!(await allowed("orders"))) {
    return NextResponse.json(
      { error: "order history is turned off in permissions" },
      { status: 403 },
    );
  }
  return NextResponse.json({ orders: await orders() });
}

/**
 * Buyurtma berish.
 *
 * ┌─ KIM BERAYOTGANI MUHIM ────────────────────────────────────────────┐
 * `placedBy` mijozdan keladi, ya'ni unga ISHONIB bo'lmaydi — agent
 * o'zini "human" deb ko'rsatishi mumkin. Shuning uchun bu maydon
 * himoya emas, faqat jurnal uchun... deb qoldirish XATO bo'lardi.
 *
 * Yechim: sahifadagi tugma `X-Ondex-Actor: human` sarlavhasini
 * QO'YMAYDI, aksincha AGENT amali `agent` deb belgilanadi va
 * belgilanmagan har qanday so'rov ham `agent` deb hisoblanadi.
 * Ya'ni standart holat — qattiqroq tomon: noma'lum manba agent deb
 * qaraladi va `place_order` ruxsatisiz o'tmaydi.
 *
 * "Odam" deb hisoblanish uchun so'rov sahifadagi forma orqali,
 * Server Action bilan kelishi kerak (`app/checkout/actions.ts`) —
 * u umuman shu yo'ldan o'tmaydi.
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

  const res = await placeOrder(method, "agent");
  if (!res.ok) {
    await logActivity("place_order", `rad etildi: ${res.error}`);
    // Ruxsat yo'qligi (403) va holat noto'g'riligi (400) farqlanadi:
    // agent birinchisida qayta urinmasligi, ikkinchisida esa avval
    // savatni to'ldirishi kerakligini tushunsin.
    return NextResponse.json(
      { error: res.error },
      { status: res.code === "invalid" ? 400 : 403 },
    );
  }
  await logActivity(
    "place_order",
    `${res.order?.restaurantName} — ${res.order?.number}`,
  );
  return NextResponse.json({ order: res.order });
}
