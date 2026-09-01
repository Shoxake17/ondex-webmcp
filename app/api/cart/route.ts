import { NextResponse } from "next/server";

import {
  addToCart,
  allowed,
  cartTotal,
  clearCart,
  logActivity,
  setCartQty,
} from "@/lib/server-state";

/** Savat holati va summasi. */
export async function GET() {
  return NextResponse.json(await cartTotal());
}

/** Savatga qo'shish. */
export async function POST(req: Request) {
  if (!(await allowed("cart"))) {
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

  const res = await addToCart(dishId, qty);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  await logActivity("add_to_cart", `${res.name} x${qty}`);
  return NextResponse.json({ ...(await cartTotal()), switched: res.switched });
}

/** Miqdorni o'zgartirish (0 — o'chirish). */
export async function PUT(req: Request) {
  if (!(await allowed("cart"))) {
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
  await setCartQty(dishId, Number(body.qty ?? 0) || 0);
  return NextResponse.json(await cartTotal());
}

export async function DELETE() {
  if (!(await allowed("cart"))) {
    return NextResponse.json(
      { error: "cart changes are turned off in permissions" },
      { status: 403 },
    );
  }
  await clearCart();
  return NextResponse.json(await cartTotal());
}
