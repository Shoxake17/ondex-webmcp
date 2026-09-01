"use client";

import { useEffect, useState } from "react";

import { webmcpAvailable } from "@/lib/webmcp";
import { TOOL_CAPABILITY, type Permissions } from "@/lib/types";
import { buildTools } from "../webmcp-tools";

/**
 * Amallar ro'yxati HAQIQIY manbadan olinadi (`buildTools`), qo'lda
 * yozilgan nusxadan emas — aks holda bu sahifa vaqt o'tib yo'q
 * amalni bor deb ko'rsatib qo'yardi.
 *
 * Bu yerda ular BAJARILMAYDI, faqat nomi va ta'rifi o'qiladi, shuning
 * uchun kontekst funksiyalari bo'sh.
 */
const TOOLS = buildTools({ say: () => {}, refresh: () => {}, go: () => {} }).map(
  (t) => ({ name: t.name, description: t.description }),
);

export default function Probe({ permissions }: { permissions: Permissions }) {
  // `null` — hali tekshirilmagan. Buni `false` bilan almashtirsak,
  // sahifa bir lahza "qo'llamaydi" deb chaqnab olardi.
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(webmcpAvailable());
  }, []);

  return (
    <>
      <div
        className={`mt-5 rounded-2xl border p-4 ${
          supported === null
            ? "border-neutral-200 bg-neutral-50"
            : supported
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        {supported === null ? (
          <p className="text-[14px] text-neutral-500">Checking…</p>
        ) : supported ? (
          <>
            <p className="text-[15px] font-bold text-emerald-900">
              WebMCP is available
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
              <code>document.modelContext</code> exists, and this page
              registered {TOOLS.length} tools. Ask your agent to find a dish.
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-bold text-amber-900">
              WebMCP is not available in this browser
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900">
              <code>document.modelContext</code> is missing, so no tools were
              registered. The store still works normally — only the agent path
              is off.
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-amber-900">
              <li>
                <strong>ChatGPT app</strong> — open this URL in its in-app
                browser.
              </li>
              <li>
                <strong>Chrome 149+</strong> — open{" "}
                <code>chrome://flags/#enable-webmcp-testing</code>, set it to{" "}
                <em>Enabled</em>, restart Chrome, then reload this page.
              </li>
            </ul>
          </>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-bold">
        Published tools ({TOOLS.length})
      </h2>
      <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {TOOLS.map((t) => {
          const cap = TOOL_CAPABILITY[t.name];
          const on = cap ? permissions[cap] : true;
          return (
            <li key={t.name} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <code className="text-[13px] font-bold text-brand">{t.name}</code>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    on
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {on ? "allowed" : "blocked"}
                </span>
                <span className="text-[11px] text-neutral-400">{cap}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
                {t.description}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
