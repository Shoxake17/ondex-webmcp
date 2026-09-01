"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { webmcpAvailable } from "@/lib/webmcp";

/**
 * "Shaddiy Ai Agent hozir nima qilyapti" lentasi.
 *
 * ┌─ NEGA BU FUNKSIYANING BIR QISMI ───────────────────────────────────┐
 * WebMCP'da sahifani agent boshqaradi: ekran o'zi almashadi, savat
 * o'zi to'ladi. Tushuntirishsiz bu "ilova buzuq" yoki "kimdir
 * boshqarayapti" bo'lib ko'rinadi.
 *
 * Lenta ikkita savolga javob beradi — KIM va NIMA qilyapti. Pul
 * sarflaydigan oqimda bu bezak emas, ishonchning sharti.
 * └────────────────────────────────────────────────────────────────────┘
 */

type Bar = { push: (message: string) => void };

const BarContext = createContext<Bar | null>(null);

const HIDE_AFTER_MS = 6000;

export function AgentBarProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(webmcpAvailable());
  }, []);

  const push = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), HIDE_AFTER_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo<Bar>(() => ({ push }), [push]);

  return (
    <BarContext.Provider value={value}>
      {children}
      {message && <ActivityPill text={message} />}
      {/* WebMCP yo'q brauzerda bu sahifa oddiy do'kon bo'lib
          ishlayveradi — lekin sudya/foydalanuvchi NEGA agent
          ishlamayotganini bilishi kerak. Jimgina "ishlamaslik" eng
          yomon variant. */}
      {!supported && <UnsupportedNote />}
    </BarContext.Provider>
  );
}

export function useAgentBar(): Bar {
  return useContext(BarContext) ?? { push: () => {} };
}

function ActivityPill({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3"
    >
      <div className="flex max-w-md items-center gap-2.5 rounded-2xl bg-neutral-900/92 px-3.5 py-2.5 text-white shadow-lg backdrop-blur">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold leading-tight">
            Shaddiy Ai Agent
          </div>
          <div className="truncate text-[11.5px] leading-tight text-neutral-300">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnsupportedNote() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-[12px] text-amber-900">
      This browser does not expose WebMCP. Open in the ChatGPT app browser, or
      Chrome 149+ with <code>chrome://flags/#enable-webmcp-testing</code>{" "}
      enabled. The store below works normally either way.
    </div>
  );
}
