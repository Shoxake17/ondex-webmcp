import Link from "next/link";

import { loadState } from "@/lib/server-state";
import Probe from "./probe";

/**
 * Diagnostika: "agent bu sahifani ko'ryaptimi?".
 *
 * ┌─ NEGA KERAK ───────────────────────────────────────────────────────┐
 * WebMCP hali bayroq ortida. Bayroq yoqilmagan brauzerda sahifa
 * JIMGINA oddiy do'kon bo'lib qolaveradi — na xato, na ogohlantirish.
 * Sinayotgan odam (yoki sudya) "demo buzuq" degan xulosaga keladi.
 *
 * Bu sahifa aynan shuni ko'rsatadi: brauzer qo'llaydimi, nechta amal
 * ro'yxatdan o'tdi, va qaysi biri hozir ruxsat etilgan.
 * └────────────────────────────────────────────────────────────────────┘
 */
export default async function AgentPage() {
  const { permissions: perms } = await loadState();

  return (
    <>
      <h1 className="text-xl font-extrabold tracking-tight">Agent check</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600">
        Whether this browser can see the tools this page publishes.
      </p>

      <Probe permissions={perms} />

      <p className="mt-8 text-[12.5px] text-neutral-500">
        Permissions are set on the{" "}
        <Link href="/permissions" className="font-semibold text-brand">
          permissions page
        </Link>
        .
      </p>
    </>
  );
}
