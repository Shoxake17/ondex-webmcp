import { NextResponse } from "next/server";

/**
 * Ovozli rejim uchun QISQA MUDDATLI token.
 *
 * ┌─ NEGA KALIT BRAUZERGA BERILMAYDI ──────────────────────────────────┐
 * Eng oson yo'l `GEMINI_API_KEY` ni mijozga uzatib, brauzerdan
 * to'g'ridan-to'g'ri ulanish bo'lardi. Lekin ochiq demoda bu kalitni
 * har kimga tarqatish demakdir — birinchi ochgan odam uni olib,
 * hisobingizga istagancha so'rov yuboraveradi.
 *
 * Ephemeral token buni hal qiladi: kalit SERVERDA qoladi, brauzerga
 * esa bir martalik, qisqa muddatli token beriladi. O'g'irlansa ham
 * bir necha daqiqada o'ladi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ NEGA BRAUZER TO'G'RIDAN-TO'G'RI ULANADI ──────────────────────────┐
 * Ovozni o'z serverimiz orqali o'tkazsak, uzluksiz WebSocket kerak
 * bo'lardi — serverless muhitda esa bunday ulanish yashamaydi.
 * Token bu to'siqni butunlay aylanib o'tadi va ovoz kechikishini ham
 * kamaytiradi.
 * └────────────────────────────────────────────────────────────────────┘
 */

/** Ovoz modeli. Kerak bo'lsa muhit o'zgaruvchisi bilan almashtiriladi. */
const MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-native-audio-latest";

/** Sessiyani boshlash oynasi. */
const START_WINDOW_MS = 60_000;
/** Suhbatning eng uzun davomiyligi. */
const SESSION_MS = 10 * 60_000;

export async function POST() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // Kalit yo'q — bu XATO emas. Repo'ni klonlagan odamda kalit
    // bo'lmasligi tabiiy; ovoz o'chadi, do'kon ishlayveradi.
    return NextResponse.json(
      { error: "voice is not configured on this deployment" },
      { status: 503 },
    );
  }

  const now = Date.now();
  let res: Response;
  try {
    res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          newSessionExpireTime: new Date(now + START_WINDOW_MS).toISOString(),
          expireTime: new Date(now + SESSION_MS).toISOString(),
          // Model va javob turi SERVERDA qulflanadi — mijoz ularni
          // o'zgartira olmaydi.
          liveConnectConstraints: {
            model: `models/${MODEL}`,
            config: { responseModalities: ["AUDIO"] },
          },
        }),
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: `could not reach the token service: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const text = await res.text();
  if (!res.ok) {
    // Xatoni YASHIRMAYMIZ: ovoz ishlamaganda sababi ko'rinmasa,
    // uni topib bo'lmaydi. Kalitning o'zi javobda qaytmaydi.
    return NextResponse.json(
      { error: `token service refused (${res.status}): ${text.slice(0, 300)}` },
      { status: 502 },
    );
  }

  let token = "";
  try {
    token = (JSON.parse(text) as { name?: string }).name ?? "";
  } catch {
    return NextResponse.json(
      { error: "token service returned an unreadable response" },
      { status: 502 },
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "token service returned no token" },
      { status: 502 },
    );
  }

  return NextResponse.json({ token, model: MODEL });
}
