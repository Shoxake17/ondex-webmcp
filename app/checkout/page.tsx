import Link from "next/link";

import { sum } from "@/lib/catalog";
import { cartTotal, loadState } from "@/lib/server-state";
import { placeOrderAsHuman } from "./actions";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [state, sp] = await Promise.all([loadState(), searchParams]);
  const cart = cartTotal(state);
  const perms = state.permissions;

  if (cart.items.length === 0) {
    return (
      <>
        <h1 className="text-xl font-extrabold tracking-tight">Checkout</h1>
        <p className="mt-3 text-[14px] text-neutral-500">
          The cart is empty.{" "}
          <Link href="/" className="font-semibold text-brand">
            Browse restaurants
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-extrabold tracking-tight">Checkout</h1>
      <p className="mt-1 text-[13px] text-neutral-500">
        {cart.restaurantName} · {cart.items.length} item type(s)
      </p>

      {sp.error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {sp.error}
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
        {cart.items.map((i) => (
          <div key={i.dishId} className="flex justify-between py-1 text-[14px]">
            <span>
              {i.name} × {i.qty}
            </span>
            <span>{sum(i.priceTiyin * i.qty)}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 font-bold">
          <span>Total</span>
          <span>{sum(cart.totalTiyin)}</span>
        </div>
      </div>

      <form action={placeOrderAsHuman} className="mt-5">
        <fieldset className="rounded-2xl border border-neutral-200 p-4">
          <legend className="px-1 text-[13px] font-semibold text-neutral-500">
            Payment
          </legend>
          <label className="flex items-center gap-2.5 py-1 text-[14px]">
            <input type="radio" name="paymentMethod" value="cash" defaultChecked />
            Cash on delivery
          </label>
          <label className="flex items-center gap-2.5 py-1 text-[14px]">
            <input type="radio" name="paymentMethod" value="card" />
            Card
            <span className="text-[12px] text-neutral-400">
              — you confirm this one yourself
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          className="mt-4 w-full rounded-2xl bg-brand py-3.5 font-bold text-white transition-colors hover:bg-brand-light"
        >
          Place order · {sum(cart.totalTiyin)}
        </button>
      </form>

      {/* ┌─ AGENT NIMA QILA OLISHI SHU YERDA AYTILADI ────────────────┐
          Foydalanuvchi to'lov ekranida turganda aynan shu savol
          tug'iladi: "agent buni o'zi bosa oladimi?". Javobni
          yashirish o'rniga shu yerda beramiz.
          └────────────────────────────────────────────────────────────┘ */}
      <p className="mt-4 text-[12.5px] leading-relaxed text-neutral-500">
        {perms.place_order ? (
          <>
            Your agent is allowed to place <strong>cash</strong> orders on your
            behalf. Card orders always require this button.{" "}
            <Link href="/permissions" className="font-semibold text-brand">
              Change
            </Link>
          </>
        ) : (
          <>
            Your agent can fill the cart and open this page, but it{" "}
            <strong>cannot place the order</strong>.{" "}
            <Link href="/permissions" className="font-semibold text-brand">
              Allow it
            </Link>{" "}
            if you want hands-free ordering.
          </>
        )}
      </p>
    </>
  );
}
