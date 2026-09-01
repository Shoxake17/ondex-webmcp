import { NextResponse } from "next/server";

import { allowed, cartTotal, loadState, logActivity, saveState } from "@/lib/server-state";

/**
 * Rasmiylashtirishga o'tish uchun tekshiruv.
 *
 * ┌─ NEGA ALOHIDA YO'L KERAK BO'LDI ───────────────────────────────────┐
 * `open_checkout` amali faqat ekranni almashtirardi va savatni
 * `/api/cart` dan o'qirdi. Ya'ni `checkout` imkoniyati ruxsatlar
 * sahifasida o'chirgich sifatida turgan, lekin SERVERDA hech qayerda
 * tekshirilmagan — bezak bo'lib qolgan.
 *
 * Endi amal shu yo'ldan o'tadi va o'chirilgan imkoniyat haqiqatan
 * to'sadi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function GET() {
  const state = await loadState();
  if (!allowed(state, "checkout")) {
    logActivity(state, "open_checkout", "checkout is turned off", true);
    await saveState(state);
    return NextResponse.json(
      { error: "opening checkout is turned off in permissions" },
      { status: 403 },
    );
  }

  const cart = cartTotal(state);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "cart is empty" }, { status: 400 });
  }

  logActivity(state, "open_checkout", `${cart.restaurantName}`);
  await saveState(state);
  return NextResponse.json(cart);
}
