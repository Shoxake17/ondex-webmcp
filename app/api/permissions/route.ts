import { NextResponse } from "next/server";

import { loadState, saveState, setPermission } from "@/lib/server-state";

export async function GET() {
  const state = await loadState();
  return NextResponse.json({
    permissions: state.permissions,
    activity: state.activity,
  });
}

/**
 * Ruxsatni yoqish/o'chirish.
 *
 * ┌─ BU YO'L AGENTGA OCHILMAGAN ───────────────────────────────────────┐
 * `app/webmcp-tools.tsx` da bunday amal YO'Q va bu ataylab: agent
 * o'ziga ruxsat bera oladigan bo'lsa, butun ruxsatlar tizimi
 * ma'nosiz bo'lardi.
 *
 * Yo'lning o'zi ochiq qoladi, chunki uni SAHIFADAGI o'chirgich
 * chaqiradi — ya'ni odam. Agent ham texnik jihatdan `fetch` qila
 * oladi (u sahifa kontekstida ishlaydi), lekin buni qilishi uchun
 * unga bunday amal ma'lum bo'lishi kerak edi; WebMCP orqali u
 * e'lon qilinmagan.
 *
 * To'liq himoya uchun keyingi qadam — o'chirgichni Server Action
 * qilish (CSRF token bilan). Demo doirasida bu ortiqcha, lekin
 * README'da cheklov sifatida aytilgan.
 * └────────────────────────────────────────────────────────────────────┘
 */
export async function PUT(req: Request) {
  let body: { name?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request body" }, { status: 400 });
  }
  const state = await loadState();
  const res = setPermission(state, String(body.name ?? ""), Boolean(body.enabled));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  await saveState(state);
  return NextResponse.json({ permissions: state.permissions });
}
