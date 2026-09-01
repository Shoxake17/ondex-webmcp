import { NextResponse } from "next/server";

import { RESTAURANTS, menuOf, restaurantById, searchDishes } from "@/lib/catalog";
import { allowed, logActivity } from "@/lib/server-state";

/**
 * Katalog: restoranlar, menyu, qidiruv.
 *
 * Uchala amal bitta yo'lda — ular bir xil ruxsatga (`browse`) tegishli
 * va bir xil ma'lumot manbaidan o'qiydi. Uchta alohida fayl faqat
 * takror bo'lardi.
 *
 * ★ Ruxsat SHU YERDA tekshiriladi. Mijozdagi tekshiruv qulaylik
 * uchun; yagona ishonchli chegara — server.
 */
export async function GET(req: Request) {
  if (!(await allowed("browse"))) {
    return NextResponse.json(
      { error: "browsing is turned off in permissions" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const restaurantId = url.searchParams.get("restaurant");

  if (q) {
    const found = searchDishes(q);
    await logActivity("search_dishes", `"${q}" — ${found.length} ta natija`);
    return NextResponse.json({
      dishes: found.map((d) => ({
        ...d,
        restaurantName: restaurantById(d.restaurantId)?.name ?? "",
        restaurantOpen: restaurantById(d.restaurantId)?.open ?? false,
      })),
    });
  }

  if (restaurantId) {
    const rest = restaurantById(restaurantId);
    if (!rest) {
      return NextResponse.json({ error: "no such restaurant" }, { status: 404 });
    }
    await logActivity("open_menu", rest.name);
    return NextResponse.json({ restaurant: rest, menu: menuOf(restaurantId) });
  }

  return NextResponse.json({ restaurants: RESTAURANTS });
}
