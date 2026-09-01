import { NextResponse } from "next/server";

import {
  addToCart,
  allowed,
  cartTotal,
  clearCart,
  loadState,
  logActivity,
  saveState,
  setCartQty,
} from "@/lib/server-state";

/**
 * ┌─ HOLAT: BIR MARTA O'QIB, BIR MARTA YOZAMIZ ────────────────────────┐
 * Holat imzolangan cookie'da. `saveState` cookie'ni BUTUNLAY qayta
 * yozadi, shuning uchun bitta so'rov ichida ikki marta yozish
 * birinchisini yo'q qilardi (masalan savatga qo'shish, keyin jurnalga
 * yozish — savat yo'qolardi).
 *
 * Shu sabab har bir yo'l: `loadState` -> o'zgartirish -> `saveState`.
 * └────────────────────────────────────────────────────────────────────┘
 */

/** Savat holati va summasi. */
export async function GET() {
  return NextResponse.json(cartTotal(await loadState()));
}

/** Savatga qo'shish. */
export async function POST(req: Request) {
  const state = await loadState();
  if (!allowed(state, "cart")) {
    return NextResponse.json(
      { error: "cart changes are turned off in permissions" },
      { status: 403 },
    );
  }

  let body: { dishId?: string; qty?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request body" }, { status: 400 });
  }

  const dishId = String(body.dishId ?? "").trim();
  // Miqdor CHEGARALANADI: agent xato hisoblasa ham savatga 1000 ta
  // taom tushmasin.
  const qty = Math.min(Math.max(Number(body.qty ?? 1) || 1, 1), 20);
  if (!dishId) {
    return NextResponse.json({ error: "dishId is required" }, { status: 400 });
  }

  const res = addToCart(state, dishId, qty);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  logActivity(state, "add_to_cart", `${res.name} x${qty}`);
  await saveState(state);
  return NextResponse.json({ ...cartTotal(state), switched: res.switched });
}

/** Miqdorni o'zgartirish (0 — o'chirish). */
export async function PUT(req: Request) {
  const state = await loadState();
  if (!allowed(state, "cart")) {
    return NextResponse.json(
      { error: "cart changes are turned off in permissions" },
      { status: 403 },
    );
  }
  let body: { dishId?: string; qty?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request body" }, { status: 400 });
  }
  const dishId = String(body.dishId ?? "").trim();
  if (!dishId) {
    return NextResponse.json({ error: "dishId is required" }, { status: 400 });
  }
  setCartQty(state, dishId, Number(body.qty ?? 0) || 0);
  await saveState(state);
  return NextResponse.json(cartTotal(state));
}

export async function DELETE() {
  const state = await loadState();
  if (!allowed(state, "cart")) {
    return NextResponse.json(
      { error: "cart changes are turned off in permissions" },
      { status: 403 },
    );
  }
  clearCart(state);
  await saveState(state);
  return NextResponse.json(cartTotal(state));
}
