"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MicStream, PcmPlayer, fromBase64, toBase64 } from "@/lib/voice";
import { useAgentBar } from "./agent-bar";
import { buildTools } from "./webmcp-tools";

/**
 * Shaddiy — sahifaning O'Z ovozli agenti.
 *
 * ┌─ NEGA BU WEBMCP HIKOYASINI KUCHAYTIRADI ───────────────────────────┐
 * WebMCP amallari brauzer agentiga mo'ljallangan, ya'ni ularni
 * ishlatish uchun ChatGPT ilovasi yoki bayroq yoqilgan Chrome kerak.
 * Oddiy brauzerda sahifa jim turadi.
 *
 * Shaddiy AYNAN SHU amallarni chaqiradi — `buildTools()` dan, bir
 * xil ro'yxatdan. Ya'ni bitta amallar to'plamiga ikkita butunlay
 * boshqa agent murojaat qiladi: begona (ChatGPT) va o'zimizniki.
 * Amallar agentga bog'liq emasligi shundan ko'rinadi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ MODEL — XAVFSIZLIK CHEGARASI EMAS ────────────────────────────────┐
 * Ko'rsatma va amallar ro'yxati brauzerdan yuboriladi, ya'ni ularni
 * o'zgartirish mumkin. Bu ATAYLAB shunday: haqiqiy tekshiruv baribir
 * API yo'lining ichida. Ko'rsatmani butunlay o'chirib tashlagan
 * odam ham `place_order` ruxsatini aylanib o'ta olmaydi.
 * └────────────────────────────────────────────────────────────────────┘
 */

const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/" +
  "google.ai.generativelanguage.v1beta.GenerativeService." +
  "BidiGenerateContentConstrained";

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

type Status = "idle" | "starting" | "live" | "error";

type Line = { who: "you" | "shaddiy"; text: string };

export default function Shaddiy() {
  const router = useRouter();
  const bar = useAgentBar();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const ws = useRef<WebSocket | null>(null);
  const mic = useRef<MicStream | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  // Xato allaqachon ko'rsatilganmi. `status` ni ishlatib bo'lmaydi:
  // hodisa ishlovchilari yaratilgan paytdagi qiymatni ushlab qoladi,
  // va yopilish xabari aniqroq xatoni bosib ketardi.
  const failed = useRef(false);
  // Transkripsiya bo'lak-bo'lak keladi; oxirgi qatorga qo'shib boramiz.
  const partial = useRef<{ who: Line["who"]; text: string } | null>(null);

  const append = useCallback((who: Line["who"], chunk: string) => {
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.who === who && partial.current?.who === who) {
        return [...prev.slice(0, -1), { who, text: last.text + chunk }];
      }
      return [...prev, { who, text: chunk }];
    });
    partial.current = { who, text: chunk };
  }, []);

  const stop = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    mic.current?.stop();
    mic.current = null;
    player.current?.close();
    player.current = null;
    partial.current = null;
    setStatus("idle");
  }, []);

  // Sahifadan chiqilganda mikrofon ochiq qolmasin.
  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setError(null);
    failed.current = false;
    setStatus("starting");
    setOpen(true);

    try {
      // 1. Qisqa muddatli token. Kalit serverda qoladi.
      const tokenRes = await fetch("/api/live-token", { method: "POST" });
      const tokenBody = (await tokenRes.json()) as {
        token?: string;
        error?: string;
      };
      if (!tokenRes.ok || !tokenBody.token) {
        throw new Error(tokenBody.error ?? `token request failed (${tokenRes.status})`);
      }

      // 2. Ovoz chiqishi. Brauzer avtomatik ovozni bloklaydi, shuning
      //    uchun bu bosish ichida bajarilishi SHART.
      const out = new PcmPlayer();
      await out.resume();
      player.current = out;

      // 3. Ulanish.
      const socket = new WebSocket(
        `${WS_URL}?access_token=${encodeURIComponent(tokenBody.token)}`,
      );
      ws.current = socket;

      const tools = buildTools({
        say: bar.push,
        refresh: () => router.refresh(),
        go: (path) => router.push(path),
      });

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            setup: {
              // Model tokenda qulflangan; bu yerda faqat suhbat sozlamalari.
              generationConfig: { responseModalities: ["AUDIO"] },
              systemInstruction: { parts: [{ text: PERSONA }] },
              tools: [
                {
                  functionDeclarations: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    ...toGeminiSchema(t.inputSchema),
                  })),
                },
              ],
              // Ikkalasi ham matn uchun: ekranda nima aytilgani
              // ko'rinsin. Ovoz — eng tekshirib bo'lmaydigan interfeys.
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          }),
        );
      };

      socket.onerror = () => {
        if (failed.current) return;
        failed.current = true;
        setError("the voice connection failed");
        setStatus("error");
      };

      socket.onclose = (e) => {
        if (e.code !== 1000 && !failed.current) {
          failed.current = true;
          setError(
            e.reason
              ? `connection closed: ${e.reason}`
              : `connection closed (code ${e.code})`,
          );
          setStatus("error");
        }
        mic.current?.stop();
        mic.current = null;
      };

      socket.onmessage = async (event) => {
        const raw =
          typeof event.data === "string"
            ? event.data
            : await (event.data as Blob).text();
        let msg: ServerMessage;
        try {
          msg = JSON.parse(raw) as ServerMessage;
        } catch {
          return;
        }

        if (msg.setupComplete) {
          // Mikrofon FAQAT sozlash tugagach ochiladi: undan oldin
          // yuborilgan ovoz e'tiborsiz qolardi.
          const m = new MicStream();
          await m.start((pcm) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            socket.send(
              JSON.stringify({
                realtimeInput: {
                  audio: {
                    data: toBase64(pcm),
                    mimeType: "audio/pcm;rate=16000",
                  },
                },
              }),
            );
          });
          mic.current = m;
          setStatus("live");
          return;
        }

        const content = msg.serverContent;
        if (content) {
          if (content.interrupted) {
            // Foydalanuvchi gapira boshladi — modelning navbatdagi
            // ovozini darhol to'xtatamiz.
            player.current?.stopAll();
          }
          if (content.inputTranscription?.text) {
            append("you", content.inputTranscription.text);
          }
          if (content.outputTranscription?.text) {
            append("shaddiy", content.outputTranscription.text);
          }
          for (const part of content.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              player.current?.play(fromBase64(part.inlineData.data));
            }
          }
          if (content.turnComplete) partial.current = null;
        }

        if (msg.toolCall?.functionCalls?.length) {
          const responses = [];
          for (const call of msg.toolCall.functionCalls) {
            const tool = tools.find((t) => t.name === call.name);
            let result: string;
            if (!tool) {
              result = `There is no tool called ${call.name}.`;
            } else {
              try {
                result = await tool.execute(call.args ?? {}, {
                  signal: new AbortController().signal,
                });
              } catch (e) {
                // Istisnoni YUTMAYMIZ: model natijani kutib qotib
                // qolgandan ko'ra xatoni bilgani yaxshi.
                result = `The tool failed: ${(e as Error).message}`;
              }
            }
            responses.push({
              id: call.id,
              name: call.name,
              response: { result },
            });
          }
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({ toolResponse: { functionResponses: responses } }),
            );
          }
        }
      };
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      stop();
    }
  }, [append, bar.push, router, stop]);

  return (
    <>
      <button
        type="button"
        onClick={() => (status === "idle" || status === "error" ? start() : setOpen((o) => !o))}
        className={`fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2.5 rounded-full px-5 font-bold text-white shadow-lg transition-colors ${
          status === "live" ? "bg-emerald-600" : "bg-brand hover:bg-brand-light"
        }`}
        aria-label="Talk to Shaddiy"
      >
        <MicIcon live={status === "live"} />
        <span className="text-[14px]">
          {status === "live" ? "Listening" : status === "starting" ? "…" : "Shaddiy"}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex max-h-[60vh] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
            <span className="text-[13px] font-bold">Shaddiy</span>
            <button
              type="button"
              onClick={() => {
                stop();
                setOpen(false);
              }}
              className="text-[12px] font-semibold text-neutral-400 hover:text-brand"
            >
              {status === "live" ? "Stop" : "Close"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-[12.5px] leading-relaxed text-red-700">
                {error}
              </p>
            )}
            {!error && lines.length === 0 && (
              <p className="text-[12.5px] leading-relaxed text-neutral-500">
                {status === "live"
                  ? "Speak — try “find me some osh”."
                  : "Starting…"}
              </p>
            )}
            {lines.map((l, i) => (
              <p
                key={i}
                className={`mb-2 text-[13px] leading-relaxed ${
                  l.who === "you" ? "text-neutral-500" : "font-medium"
                }`}
              >
                <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                  {l.who}
                </span>
                {l.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * JSON Schema -> Gemini sxemasi.
 *
 * Gemini tur nomlarini KATTA harfda kutadi ("OBJECT", "STRING").
 * Argumentsiz amallarda `parameters` umuman yuborilmaydi: bo'sh
 * `properties` bilan e'lon ba'zan rad etiladi.
 */
function toGeminiSchema(schema: Record<string, unknown>) {
  const props = (schema.properties ?? {}) as Record<string, unknown>;
  if (Object.keys(props).length === 0) return {};
  return { parameters: upper(schema) };
}

function upper(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(upper);
  if (typeof node !== "object" || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "type" && typeof v === "string") out[k] = v.toUpperCase();
    else out[k] = upper(v);
  }
  return out;
}

function MicIcon({ live }: { live: boolean }) {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      {live && (
        <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-white/60" />
      )}
      <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="currentColor">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
        <path d="M18 11a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.09A6 6 0 0 0 18 11Z" />
      </svg>
    </span>
  );
}

// ── Gemini xabarlari (bizga kerak bo'lgan qismi) ────────────────────

type ServerMessage = {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{
      id?: string;
      name: string;
      args?: Record<string, unknown>;
    }>;
  };
};
