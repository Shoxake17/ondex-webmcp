import { NextResponse } from "next/server";

import { allowed, loadState, orderById } from "@/lib/server-state";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const state = await loadState();
  if (!allowed(state, "orders")) {
    return NextResponse.json(
      { error: "order history is turned off in permissions" },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  const order = orderById(state, id);
  // Boshqa seansning buyurtmasi ham shu javobni oladi: "yo'q" va
  // "sizniki emas" ni ajratib ko'rsatish begona ID larni tekshirib
  // chiqish imkonini berardi.
  if (!order) {
    return NextResponse.json({ error: "no such order" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
