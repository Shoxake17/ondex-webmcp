import type { Dish, Restaurant } from "./types";

/**
 * Demo katalog.
 *
 * ┌─ NEGA XOTIRADA, BAZASIZ ───────────────────────────────────────────┐
 * Bu ochiq repo — istalgan odam `npm install && npm run dev` bilan
 * ishga tushira olishi kerak (hackathon qoidasi: repo funksional
 * bo'lsin). Baza talab qilinsa, sudya avval Postgres ko'tarishi
 * kerak bo'lardi va ko'pchilik shu yerda to'xtardi.
 *
 * OnDex'ning haqiqiy katalogi Mongo'da va bu repoga UMUMAN
 * kirmaydi — bu yerda faqat namunaviy ma'lumot.
 * └────────────────────────────────────────────────────────────────────┘
 */
export const RESTAURANTS: Restaurant[] = [
  {
    id: "r-avigo",
    name: "Avigo",
    tags: "Milliy taomlar · Osh",
    open: true,
    etaMinutes: 35,
    deliveryTiyin: 800000,
  },
  {
    id: "r-bookcafe",
    name: "Book Cafe",
    tags: "Kafe · Shirinliklar",
    open: true,
    etaMinutes: 25,
    deliveryTiyin: 600000,
  },
  {
    id: "r-fastfood",
    name: "Chust Burger",
    tags: "Fast food · Burger",
    open: true,
    etaMinutes: 20,
    deliveryTiyin: 700000,
  },
  {
    id: "r-night",
    name: "Tunki Lagmon",
    tags: "Lagmon · Sho'rva",
    open: false,
    etaMinutes: 40,
    deliveryTiyin: 900000,
  },
];

export const DISHES: Dish[] = [
  // Avigo
  d("d-osh", "r-avigo", "Osh", "Milliy", 3500000, "Qozon oshi, sabzi va no'xat bilan."),
  d("d-shurva", "r-avigo", "Sho'rva", "Milliy", 2800000, "Qo'y go'shtidan tayyorlangan sho'rva."),
  d("d-manti", "r-avigo", "Manti", "Milliy", 3200000, "5 dona, qo'lda yopilgan."),
  d("d-somsa", "r-avigo", "Somsa", "Milliy", 1200000, "Tandir somsa, go'shtli."),
  // Book Cafe
  d("d-cappuccino", "r-bookcafe", "Kapuchino", "Ichimlik", 2200000, "Ikki qavat sut ko'pigi bilan."),
  d("d-cheesecake", "r-bookcafe", "Chizkeyk", "Shirinlik", 3800000, "Nyu-York uslubida."),
  d("d-croissant", "r-bookcafe", "Kruassan", "Shirinlik", 1800000, "Sariyog'li, yangi pishirilgan."),
  // Chust Burger
  d("d-burger", "r-fastfood", "Chizburger", "Fast food", 3900000, "Mol go'shti, chedder pishloq."),
  d("d-hotdog", "r-fastfood", "Hot-dog", "Fast food", 1800000, "Klassik, xantal bilan."),
  d("d-fries", "r-fastfood", "Fri kartoshka", "Fast food", 1500000, "Katta porsiya."),
  // Tunki Lagmon (yopiq)
  d("d-lagmon", "r-night", "Lag'mon", "Milliy", 3400000, "Qo'l lag'moni."),
];

function d(
  id: string,
  restaurantId: string,
  name: string,
  category: string,
  priceTiyin: number,
  description: string,
): Dish {
  return { id, restaurantId, name, category, priceTiyin, available: true, description };
}

export function restaurantById(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

export function dishById(id: string): Dish | undefined {
  return DISHES.find((x) => x.id === id);
}

export function menuOf(restaurantId: string): Dish[] {
  return DISHES.filter((x) => x.restaurantId === restaurantId);
}

/** Nom va turkum bo'yicha qidiruv (registrga bog'liq emas). */
export function searchDishes(query: string): Dish[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DISHES.filter(
    (x) =>
      x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q),
  );
}

/** Tiyin -> "35 000 so'm". */
export function sum(tiyin: number): string {
  return `${Math.round(tiyin / 100).toLocaleString("uz-UZ")} so'm`;
}
