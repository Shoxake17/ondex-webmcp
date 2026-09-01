import Link from "next/link";

import { sum } from "@/lib/catalog";
import { cartTotal } from "@/lib/server-state";

export default async function CartPage() {
  const cart = await cartTotal();

  if (cart.items.length === 0) {
    return (
      <>
        <h1 className="text-xl font-extrabold tracking-tight">Cart</h1>
        <p className="mt-3 text-[14px] text-neutral-500">
          The cart is empty.{" "}
          <Link href="/" className="font-semibold text-brand">
            Browse restaurants
          </Link>{" "}
          — or ask your agent to find something.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-extrabold tracking-tight">Cart</h1>
      <p className="mt-1 text-[13px] text-neutral-500">{cart.restaurantName}</p>

      <div className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {cart.items.map((i) => (
          <div key={i.dishId} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{i.name}</div>
              <div className="text-[13px] text-neutral-500">
                {sum(i.priceTiyin)} × {i.qty}
              </div>
            </div>
            <div className="font-bold">{sum(i.priceTiyin * i.qty)}</div>
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-1.5 text-[14px]">
        <Row label="Subtotal" value={sum(cart.subtotalTiyin)} />
        <Row label="Delivery" value={sum(cart.deliveryTiyin)} />
        <Row label="Total" value={sum(cart.totalTiyin)} bold />
      </dl>

      <Link
        href="/checkout"
        className="mt-6 block rounded-2xl bg-brand py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-light"
      >
        Checkout
      </Link>
    </>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold" : "text-neutral-500"}>{label}</dt>
      <dd className={bold ? "font-bold" : ""}>{value}</dd>
    </div>
  );
}
