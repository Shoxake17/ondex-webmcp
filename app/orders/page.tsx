import Link from "next/link";

import { sum } from "@/lib/catalog";
import { loadState } from "@/lib/server-state";

export default async function OrdersPage() {
  const { orders: list } = await loadState();

  return (
    <>
      <h1 className="text-xl font-extrabold tracking-tight">Orders</h1>

      {list.length === 0 ? (
        <p className="mt-3 text-[14px] text-neutral-500">No orders yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {list.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="block rounded-2xl border border-neutral-200 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{o.restaurantName}</div>
                  <div className="mt-0.5 text-[13px] text-neutral-500">
                    №{o.number} · {o.status.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{sum(o.totalTiyin)}</div>
                  {/* Kim bergani KO'RSATILADI: agent bergan buyurtma
                      odam bergani bilan aralashib ketmasligi kerak. */}
                  <div className="text-[11.5px] text-neutral-400">
                    {o.placedBy === "agent" ? "by agent" : "by you"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
