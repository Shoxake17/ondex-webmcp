"use server";

import { redirect } from "next/navigation";

import { loadState, logActivity, placeOrder, saveState } from "@/lib/server-state";

/**
 * Odam tugmani bosdi.
 *
 * ┌─ NEGA SERVER ACTION, API YO'LI EMAS ───────────────────────────────┐
 * Buyurtma berishning ikkita yo'li bor va ular ATAYLAB ajratilgan:
 *
 *   odam  -> shu Server Action  -> placeOrder(..., "human")
 *   agent -> POST /api/orders   -> placeOrder(..., "agent")
 *
 * Agent "men odamman" deb ayta olmaydi, chunki u yuboradigan maydonga
 * emas, KIRISH YO'LIGA qarab hal qilinadi. API yo'li har doim "agent"
 * deb belgilaydi va `place_order` ruxsatini talab qiladi; bu Server
 * Action esa WebMCP amallari ro'yxatida umuman yo'q.
 *
 * Agar ikkalasi bitta endpoint bo'lganda, "kim chaqirdi" degan savolga
 * faqat mijoz yuborgan maydon javob berardi — ya'ni hech qanday
 * kafolat bo'lmasdi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function placeOrderAsHuman(formData: FormData) {
  const method = formData.get("paymentMethod") === "card" ? "card" : "cash";

  const state = await loadState();
  const res = placeOrder(state, method, "human");
  if (!res.ok || !res.order) {
    logActivity(state, "checkout", `xato: ${res.error}`);
    // `redirect()` istisno tashlaydi, shuning uchun holat undan OLDIN
    // saqlanishi shart — aks holda jurnal yozuvi yo'qolardi.
    await saveState(state);
    redirect(`/checkout?error=${encodeURIComponent(res.error ?? "failed")}`);
  }

  logActivity(
    state,
    "checkout",
    `odam tasdiqladi — ${res.order.number} (${method})`,
  );
  await saveState(state);
  redirect(`/orders/${res.order.id}`);
}
