"use client";

/**
 * WebMCP — sahifaning brauzer agentiga ochadigan amallari.
 *
 * ┌─ SAHIFA "NIMA QILA OLISHINI" AYTADI ───────────────────────────────┐
 * Agent (ChatGPT ichki brauzeri yoki Chrome 149+) `document.modelContext`
 * dan amallar ro'yxatini oladi va ularni chaqiradi. Sahifada til
 * modeli YO'Q — miya foydalanuvchining agentida.
 * └────────────────────────────────────────────────────────────────────┘
 */

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => Promise<string> | string;
};

type ModelContext = {
  registerTool: (
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
};

/** Brauzer WebMCP'ni qo'llaydimi. */
export function webmcpAvailable(): boolean {
  if (typeof document === "undefined") return false;
  const mc = (document as unknown as { modelContext?: ModelContext })
    .modelContext;
  return typeof mc?.registerTool === "function";
}

/**
 * Amallarni ro'yxatga oladi; qaytgan funksiya ularni olib tashlaydi.
 *
 * Tozalash `AbortController` orqali — spetsifikatsiyadagi rasmiy usul
 * va React'ning `useEffect` tozalashiga aynan mos tushadi.
 */
export function registerTools(tools: ToolDefinition[]): () => void {
  if (!webmcpAvailable()) return () => {};
  const mc = (document as unknown as { modelContext: ModelContext })
    .modelContext;

  const controller = new AbortController();
  for (const tool of tools) {
    void Promise.resolve(
      mc.registerTool(tool, { signal: controller.signal }),
    ).catch((e) => {
      console.warn(`[webmcp] "${tool.name}" registration failed:`, e);
    });
  }
  return () => controller.abort();
}

/**
 * API chaqiruvi.
 *
 * ISTISNO TASHLAMAYDI: agentga o'qiladigan matn qaytarish kerak.
 * Istisno tashlansa agent nima bo'lganini bilmay to'xtab qolardi.
 */
export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: init?.body
        ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
        : init?.headers,
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) {
      return {
        ok: false,
        error:
          (parsed as { error?: string } | null)?.error ??
          `request failed (${res.status})`,
      };
    }
    return { ok: true, data: parsed as T };
  } catch (e) {
    return { ok: false, error: `network error: ${(e as Error).message}` };
  }
}

/** Tiyin -> "35 000 so'm". */
export function sum(tiyin: number): string {
  return `${Math.round(tiyin / 100).toLocaleString("uz-UZ")} so'm`;
}

export function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}
