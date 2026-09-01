"use server";

import { revalidatePath } from "next/cache";

import { loadState, saveState, setPermission } from "@/lib/server-state";
import type { Permissions } from "@/lib/types";

/**
 * Ruxsatni yoqish/o'chirish — SERVER ACTION.
 *
 * ┌─ NEGA API YO'LI EMAS ──────────────────────────────────────────────┐
 * Avval bu `PUT /api/permissions` edi, va o'lchov aniq ko'rsatdi:
 *
 *   place_order: false -> PUT -> true
 *
 * Ya'ni sahifa kontekstidagi ISTALGAN skript o'ziga buyurtma berish
 * huquqini bera olardi. Bu loyihaning asosiy da'vosini —
 * "ruxsatni faqat odam beradi" — bekor qilardi.
 *
 * Endi e'lon qilingan HTTP yo'li YO'Q. Ruxsatni o'zgartirishning
 * yagona yo'li — sahifadagi o'chirgich, ya'ni Server Action.
 * Muhimi: WebMCP agenti faqat e'lon qilingan amallarni chaqira
 * oladi, Server Action esa ular orasida emas va bo'lishi ham mumkin
 * emas.
 *
 * Halol chegara: sahifaga ixtiyoriy JS kirita olgan hujumchidan bu
 * mutlaq himoya emas — sahifa ichidagi kod baribir sahifa ichida.
 * Lekin AGENT uchun bu yo'l butunlay yopiq, va aynan agent shu
 * loyihaning tahdid modeli.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function togglePermission(
  name: string,
  enabled: boolean,
): Promise<{ ok: true; permissions: Permissions } | { ok: false; error: string }> {
  const state = await loadState();
  const res = setPermission(state, name, enabled);
  if (!res.ok) return { ok: false, error: res.error ?? "unknown capability" };

  await saveState(state);
  revalidatePath("/permissions");
  return { ok: true, permissions: state.permissions };
}
