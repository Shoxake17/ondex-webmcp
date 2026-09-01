import Link from "next/link";

import { RESTAURANTS, sum } from "@/lib/catalog";

export default function HomePage() {
  return (
    <>
      <section className="mb-7 rounded-2xl border border-neutral-200 bg-orange-50/60 p-5">
        <h1 className="text-lg font-extrabold tracking-tight">
          Order food by talking to your browser agent
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600">
          This storefront exposes its actions through{" "}
          <strong>WebMCP</strong>. Open it in the ChatGPT app browser (or
          Chrome 149+ with the WebMCP flag) and ask, for example:
        </p>
        <ul className="mt-3 space-y-1.5 text-[13.5px] text-neutral-700">
          <li>&ldquo;Find osh and add two portions to my cart&rdquo;</li>
          <li>&ldquo;What&apos;s in my cart and how much is it?&rdquo;</li>
          <li>&ldquo;Order it with cash&rdquo;</li>
        </ul>
        <p className="mt-3 text-[12.5px] text-neutral-500">
          The last one only works if you allow it on the{" "}
          <Link href="/permissions" className="font-semibold text-brand">
            Permissions
          </Link>{" "}
          page — placing orders is off by default.
        </p>
      </section>

      <h2 className="mb-3 text-[15px] font-bold">Restaurants</h2>
      <div className="space-y-3">
        {RESTAURANTS.map((r) => (
          <Link
            key={r.id}
            href={`/restaurants/${r.id}`}
            className="block rounded-2xl border border-neutral-200 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">
                  {r.name}
                  {!r.open && (
                    <span className="ml-2 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                      closed
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] text-neutral-500">{r.tags}</div>
              </div>
              <div className="shrink-0 text-right text-[12.5px] text-neutral-500">
                <div>~{r.etaMinutes} min</div>
                <div>{sum(r.deliveryTiyin)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
