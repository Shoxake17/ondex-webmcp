import { NextResponse } from "next/server";

import { geminiFunctionDeclarations } from "@/lib/tool-specs";

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

/**
 * Shaddiy kim va nima qila oladi.
 *
 * Ko'rsatma SERVERDA turadi va tokenga kiradi — brauzerdan
 * o'zgartirib bo'lmaydi. Shunga qaramay bu XAVFSIZLIK CHEGARASI EMAS:
 * haqiqiy tekshiruv API yo'llarining ichida. Ko'rsatmani butunlay
 * chetlab o'tgan model ham `place_order` ruxsatisiz buyurtma bera
 * olmaydi.
 */
const PERSONA = `You are Shaddiy, the voice assistant built into this OnDex
food-ordering page. Shoxrux created you. Never call yourself Gemini, Google or
an AI language model — your name is Shaddiy.

Reply in whatever language the user speaks to you. Keep answers short: this is
speech, not an essay. One or two sentences is usually right.

You act on this page through the tools you were given. Rules that matter:
- Never invent a dish_id or restaurant_id. Search first, then use the id the
  search returned.
- Read the tool result before you answer. If a tool says it failed, say so
  plainly instead of claiming success.
- Adding to the cart is safe. Placing an order spends the user's money, so
  never call place_order until the user has clearly agreed out loud.
- If place_order comes back refused, do not retry it. Explain that the user
  can either press the button on the checkout page themselves, or turn on
  "Place orders" on the permissions page. Both are legitimate.
- You can only place cash orders. Card payment always stays with the user.`;

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
          // ┌─ BUTUN SOZLAMA SERVERDA ────────────────────────────────┐
          // Model, ko'rsatma va amallar ro'yxati tokenning ichiga
          // kiradi. Ya'ni brauzer ularni o'zgartira olmaydi: sahifaga
          // begona skript kirsa ham modelga yangi amal qo'sha olmaydi
          // yoki ko'rsatmani almashtira olmaydi.
          //
          // Maydon nomi hujjatdagi `liveConnectConstraints` emas —
          // API'ning o'z ta'rifida (discovery) u
          // `bidiGenerateContentSetup` deb ataladi.
          // └──────────────────────────────────────────────────────────┘
          bidiGenerateContentSetup: {
            model: `models/${MODEL}`,
            generationConfig: { responseModalities: ["AUDIO"] },
            systemInstruction: { parts: [{ text: PERSONA }] },
            tools: [{ functionDeclarations: geminiFunctionDeclarations() }],
            // Ekranda nima aytilgani ko'rinsin — ovoz eng tekshirib
            // bo'lmaydigan interfeys.
            inputAudioTranscription: {},
            outputAudioTranscription: {},
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
