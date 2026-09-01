import Link from "next/link";
import { notFound } from "next/navigation";

import { sum } from "@/lib/catalog";
import { loadState, orderById } from "@/lib/server-state";

const STEPS = ["placed", "cooking", "on_the_way", "delivered"] as const;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = orderById(await loadState(), id);
  if (!order) notFound();

  const stepIndex = STEPS.indexOf(order.status);

  return (
    <>
      <Link href="/orders" className="text-[13px] text-neutral-500 hover:text-brand">
        ← Orders
      </Link>

      <h1 className="mt-3 text-xl font-extrabold tracking-tight">
        Order №{order.number}
      </h1>
      <p className="mt-1 text-[13px] text-neutral-500">
        {order.restaurantName} ·{" "}
        {order.paymentMethod === "cash" ? "cash on delivery" : "card"} ·{" "}
        {order.placedBy === "agent" ? "placed by your agent" : "placed by you"}
      </p>

      <ol className="mt-5 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[14px]">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                i <= stepIndex ? "bg-brand" : "bg-neutral-200"
              }`}
            />
            <span className={i <= stepIndex ? "font-semibold" : "text-neutral-400"}>
              {s.replace(/_/g, " ")}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border border-neutral-200 p-4">
        {order.lines.map((l, i) => (
          <div key={i} className="flex justify-between py-1 text-[14px]">
            <span>
              {l.name} × {l.qty}
            </span>
            <span>{sum(l.priceTiyin * l.qty)}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 font-bold">
          <span>Total</span>
          <span>{sum(order.totalTiyin)}</span>
        </div>
      </div>
    </>
  );
}
