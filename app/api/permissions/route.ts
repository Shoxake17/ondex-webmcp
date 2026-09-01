import { NextResponse } from "next/server";

import { loadState } from "@/lib/server-state";

/**
 * Ruxsatlarni O'QISH.
 *
 * ┌─ BU YERDA `PUT` YO'Q, VA BU ATAYLAB ───────────────────────────────┐
 * Avval shu faylda ruxsatni o'zgartiradigan `PUT` bor edi. Sinov uni
 * ochiq teshik sifatida ko'rsatdi: sahifa kontekstidagi istalgan
 * skript `place_order` ni o'ziga yoqib olardi.
 *
 * O'zgartirish endi faqat Server Action orqali — `app/permissions/
 * actions.ts`. Agent e'lon qilingan amallardangina foydalana oladi,
 * ya'ni u yo'l unga butunlay yopiq.
 *
 * O'qish qolgan: u hech narsani ochib bermaydi (foydalanuvchi
 * ruxsatlarini o'zi ko'rmoqda) va nosozlikni aniqlashda kerak.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function GET() {
  const state = await loadState();
  return NextResponse.json({
    permissions: state.permissions,
    activity: state.activity,
  });
}
