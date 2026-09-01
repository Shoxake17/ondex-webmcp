import Link from "next/link";
import { notFound } from "next/navigation";

import { menuOf, restaurantById, sum } from "@/lib/catalog";
import AddButton from "./add-button";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = restaurantById(id);
  if (!restaurant) notFound();

  const menu = menuOf(id);

  return (
    <>
      <Link href="/" className="text-[13px] text-neutral-500 hover:text-brand">
        ← Restaurants
      </Link>

      <h1 className="mt-3 text-xl font-extrabold tracking-tight">
        {restaurant.name}
      </h1>
      <p className="mt-1 text-[13px] text-neutral-500">
        {restaurant.tags} · ~{restaurant.etaMinutes} min · delivery{" "}
        {sum(restaurant.deliveryTiyin)}
        {!restaurant.open && " · closed right now"}
      </p>

      <div className="mt-5 space-y-3">
        {menu.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4"
          >
            <div className="min-w-0">
              <div className="font-semibold">{d.name}</div>
              <div className="mt-0.5 text-[13px] text-neutral-500">
                {d.description}
              </div>
              <div className="mt-1.5 text-[13.5px] font-bold">
                {sum(d.priceTiyin)}
              </div>
            </div>
            <AddButton dishId={d.id} disabled={!restaurant.open} />
          </div>
        ))}
      </div>
    </>
  );
}
