"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/webmcp";

/**
 * "+" tugmasi.
 *
 * Agent ham AYNAN shu API yo'lini (`POST /api/cart`) chaqiradi —
 * ya'ni odam va agent bitta kod yo'lidan yuradi. Ikki xil yo'l bo'lsa,
 * ulardan biri (masalan restoran yopiqligi tekshiruvi) e'tibordan
 * chetda qolardi.
 */
export default function AddButton({
  dishId,
  disabled,
}: {
  dishId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    setError(null);
    start(async () => {
      const r = await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({ dishId, qty: 1 }),
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={add}
        disabled={disabled || pending}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-light disabled:opacity-40"
      >
        {pending ? "…" : "Add"}
      </button>
      {error && (
        <div className="mt-1 max-w-[9rem] text-[11px] text-red-600">{error}</div>
      )}
    </div>
  );
}
