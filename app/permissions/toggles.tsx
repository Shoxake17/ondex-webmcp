"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CAPABILITIES, type Capability, type Permissions } from "@/lib/types";
import { togglePermission } from "./actions";

/**
 * Har bir imkoniyat NIMA ekanini va o'chirilsa NIMA bo'lishini aytadi.
 *
 * Ichki nomlar (`place_order`) ko'rsatilmaydi: odam nimaga ruxsat
 * berayotganini TUSHUNGAN holda hal qilishi kerak.
 */
const INFO: Record<Capability, { title: string; text: string }> = {
  browse: {
    title: "Browse the catalog",
    text: "Search dishes, list restaurants, open menus. Read-only.",
  },
  cart: {
    title: "Change the cart",
    text: "Add dishes and change quantities. Nothing is charged.",
  },
  checkout: {
    title: "Open checkout",
    text: "Bring you to the checkout page with the cart filled in.",
  },
  place_order: {
    title: "Place orders",
    text:
      "Confirm a CASH order on your behalf, without you pressing the button. " +
      "Card orders always stay with you. Off by default.",
  },
  orders: {
    title: "See your orders",
    text: "Read order history and delivery status.",
  },
};

export default function PermissionToggles({
  initial,
}: {
  initial: Permissions;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: Capability, enabled: boolean) => {
    const previous = perms[name];
    // Darhol ko'rsatamiz, xato bo'lsa QAYTARAMIZ: ekranda yoqilgan,
    // serverda o'chiq holat eng yomon variant bo'lardi.
    setPerms((p) => ({ ...p, [name]: enabled }));
    setError(null);

    start(async () => {
      // Server Action — e'lon qilingan HTTP yo'li yo'q, ya'ni agent
      // bu chaqiruvni takrorlay olmaydi.
      const r = await togglePermission(name, enabled);
      if (!r.ok) {
        setPerms((p) => ({ ...p, [name]: previous }));
        setError(r.error);
        return;
      }
      setPerms(r.permissions);
      router.refresh();
    });
  };

  return (
    <>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {CAPABILITIES.map((cap) => (
          <label
            key={cap}
            className="flex cursor-pointer items-start gap-3 p-4"
          >
            <input
              type="checkbox"
              checked={perms[cap]}
              disabled={pending}
              onChange={(e) => toggle(cap, e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#F4511E]"
            />
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold">
                {INFO[cap].title}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-neutral-500">
                {INFO[cap].text}
              </span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
}
