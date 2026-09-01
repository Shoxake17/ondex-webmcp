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
 *
 * ┌─ NEGA BUNCHA KO'P ──────────────────────────────────────────────────┐
 * Uchta restoran ham "ishlaydi", lekin agent bilan sinaganda farq
 * darhol seziladi: kichik katalogda qidiruv har doim bitta natija
 * beradi va agent tanlashga majbur bo'lmaydi. Yopiq restoran,
 * tugagan taom va bir xil nomli taomlar — bularning har biri
 * agentning haqiqiy hayotda uchraydigan qiyin holatlari.
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
    id: "r-registon",
    name: "Registon Kabob",
    tags: "Kabob · Grill",
    open: true,
    etaMinutes: 30,
    deliveryTiyin: 900000,
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
    id: "r-tandir",
    name: "Tandir Non",
    tags: "Nonvoyxona · Somsa",
    open: true,
    etaMinutes: 15,
    deliveryTiyin: 500000,
  },
  {
    id: "r-sabzavot",
    name: "Sabzavot Bog'",
    tags: "Vegetarian · Salatlar",
    open: true,
    etaMinutes: 30,
    deliveryTiyin: 700000,
  },
  {
    // Yopiq restoran ATAYLAB bor: agent uni taklif qilib qo'ysa,
    // xatolik ekranda emas, tool javobida ko'rinishi kerak.
    id: "r-night",
    name: "Tunki Lag'mon",
    tags: "Lag'mon · Sho'rva",
    open: false,
    etaMinutes: 40,
    deliveryTiyin: 900000,
  },
];

export const DISHES: Dish[] = [
  // ── Avigo ─────────────────────────────────────────────────────────
  d("d-osh", "r-avigo", "Osh", "Milliy", 3500000,
    "Qozon oshi, sabzi va no'xat bilan.", "plov pilaf rice osh palov milliy national"),
  d("d-shurva", "r-avigo", "Sho'rva", "Milliy", 2800000,
    "Qo'y go'shtidan tayyorlangan sho'rva.", "soup shurpa broth issiq hot sho'rva"),
  d("d-manti", "r-avigo", "Manti", "Milliy", 3200000,
    "5 dona, qo'lda yopilgan.", "dumpling steamed manti go'sht meat"),
  d("d-norin", "r-avigo", "Norin", "Milliy", 3000000,
    "Qo'lda kesilgan xamir va qazi.", "norin cold noodle sovuq"),
  d("d-chuchvara", "r-avigo", "Chuchvara", "Milliy", 2600000,
    "Qaynatilgan, qatiq bilan.", "dumpling soup chuchvara pelmeni"),
  d("d-dimlama", "r-avigo", "Dimlama", "Milliy", 3300000,
    "Bug'da dimlangan go'sht va sabzavot.", "stew vegetables dimlama steamed"),

  // ── Registon Kabob ────────────────────────────────────────────────
  d("d-kabob", "r-registon", "Qo'y kabob", "Kabob", 4200000,
    "Cho'g'da pishirilgan, 2 six.", "kebab kabob lamb grill shashlik go'sht meat"),
  d("d-tovuq-kabob", "r-registon", "Tovuq kabob", "Kabob", 3400000,
    "Tovuq filesi, ziravorlarda marinadlangan.", "chicken kebab grill tovuq"),
  d("d-jaz", "r-registon", "Jaz", "Kabob", 3900000,
    "Achchiq qalampir bilan qovurilgan go'sht.", "spicy hot achchiq fried jaz qalampir"),
  d("d-tandir-gosht", "r-registon", "Tandir go'sht", "Kabob", 5200000,
    "Tandirda sekin pishirilgan qo'y go'shti.", "lamb tandir slow roast go'sht"),
  d("d-achichuk", "r-registon", "Achichuk", "Salat", 1200000,
    "Pomidor va piyoz salati.", "salad tomato onion achchiq fresh salat"),

  // ── Book Cafe ─────────────────────────────────────────────────────
  d("d-cappuccino", "r-bookcafe", "Kapuchino", "Ichimlik", 2200000,
    "Ikki qavat sut ko'pigi bilan.", "coffee cappuccino kofe ichimlik drink milk"),
  d("d-americano", "r-bookcafe", "Amerikano", "Ichimlik", 1800000,
    "Ikki porsiya espresso, issiq suv.", "coffee americano espresso kofe black"),
  d("d-latte", "r-bookcafe", "Latte", "Ichimlik", 2400000,
    "Yumshoq, ko'p sutli.", "coffee latte kofe milk sut"),
  d("d-choy", "r-bookcafe", "Ko'k choy", "Ichimlik", 800000,
    "Choynak, 1 litr.", "tea green choy issiq hot"),
  d("d-cheesecake", "r-bookcafe", "Chizkeyk", "Shirinlik", 3800000,
    "Nyu-York uslubida.", "cheesecake dessert cake shirinlik sweet tort"),
  d("d-croissant", "r-bookcafe", "Kruassan", "Shirinlik", 1800000,
    "Sariyog'li, yangi pishirilgan.", "croissant pastry breakfast nonushta sweet"),
  d("d-tiramisu", "r-bookcafe", "Tiramisu", "Shirinlik", 3600000,
    "Mascarpone va kofe bilan.", "tiramisu dessert cake coffee shirinlik sweet"),

  // ── Chust Burger ──────────────────────────────────────────────────
  d("d-burger", "r-fastfood", "Chizburger", "Fast food", 3900000,
    "Mol go'shti, chedder pishloq.", "burger cheeseburger beef fast food gamburger"),
  d("d-double-burger", "r-fastfood", "Double burger", "Fast food", 5400000,
    "Ikki qavat kotlet.", "burger double beef big katta fast food"),
  d("d-spicy-burger", "r-fastfood", "Achchiq burger", "Fast food", 4300000,
    "Jalapeno va achchiq sous bilan.", "spicy hot burger achchiq jalapeno"),
  d("d-hotdog", "r-fastfood", "Hot-dog", "Fast food", 1800000,
    "Klassik, xantal bilan.", "hotdog sausage fast food"),
  d("d-fries", "r-fastfood", "Fri kartoshka", "Fast food", 1500000,
    "Katta porsiya.", "fries potato chips kartoshka fast food"),
  d("d-nuggets", "r-fastfood", "Naggets", "Fast food", 2600000,
    "9 dona, souslar bilan.", "nuggets chicken tovuq fast food"),
  d("d-cola", "r-fastfood", "Cola 0.5", "Ichimlik", 900000,
    "Sovuq.", "cola drink ichimlik sovuq cold soda"),

  // ── Tandir Non ────────────────────────────────────────────────────
  d("d-somsa", "r-tandir", "Tandir somsa", "Nonvoyxona", 1200000,
    "Go'shtli, tandirda pishirilgan.", "samsa somsa pastry meat go'sht tandir"),
  d("d-somsa-kartoshka", "r-tandir", "Kartoshkali somsa", "Nonvoyxona", 1000000,
    "Kartoshka va piyoz bilan.", "samsa somsa potato kartoshka vegetarian"),
  d("d-obi-non", "r-tandir", "Obi non", "Nonvoyxona", 400000,
    "Tandir noni, issiq.", "bread non obi tandir fresh issiq"),
  d("d-patir", "r-tandir", "Patir", "Nonvoyxona", 700000,
    "Qatlama, sariyog'li.", "bread patir non layered"),
  // Tugagan taom ATAYLAB: agent buni to'g'ri qayta ishlashi kerak.
  d("d-gumma", "r-tandir", "Gumma", "Nonvoyxona", 900000,
    "Bugun tugagan.", "gumma pastry meat", false),

  // ── Sabzavot Bog' ─────────────────────────────────────────────────
  d("d-sezar", "r-sabzavot", "Sezar salat", "Salat", 3200000,
    "Tovuq, parmezan, kruton.", "caesar salad chicken salat tovuq"),
  d("d-grek", "r-sabzavot", "Grek salat", "Salat", 2900000,
    "Fetta pishloq va zaytun.", "greek salad feta olive salat vegetarian"),
  d("d-vinegret", "r-sabzavot", "Vinegret", "Salat", 1600000,
    "Lavlagi va kartoshka.", "salad beetroot vegetarian salat"),
  d("d-sabzavot-sup", "r-sabzavot", "Sabzavotli sho'rva", "Milliy", 2200000,
    "Go'shtsiz, yengil.", "soup vegetable vegetarian sho'rva yengil light"),
  d("d-smuzi", "r-sabzavot", "Meva smuzi", "Ichimlik", 2400000,
    "Banan, qulupnay, yogurt.", "smoothie fruit drink ichimlik meva sovuq"),

  // ── Tunki Lag'mon (restoran yopiq) ────────────────────────────────
  d("d-lagmon", "r-night", "Lag'mon", "Milliy", 3400000,
    "Qo'l lag'moni.", "lagman noodle soup lag'mon"),
  d("d-quyruq", "r-night", "Quyruq sho'rva", "Milliy", 3100000,
    "Tunda ochiladi.", "soup tail sho'rva issiq"),
];

function d(
  id: string,
  restaurantId: string,
  name: string,
  category: string,
  priceTiyin: number,
  description: string,
  keywords: string,
  available = true,
): Dish {
  return {
    id,
    restaurantId,
    name,
    category,
    priceTiyin,
    available,
    description,
    keywords,
  };
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

/**
 * Qidiruv.
 *
 * Nom, turkum, tavsif va kalit so'zlar bo'yicha — ya'ni "osh" ham,
 * "plov" ham, "rice" ham bir xil natijani beradi. Bir necha so'z
 * yozilsa, HAR BIRI mos kelishi kerak ("achchiq burger" faqat achchiq
 * burgerni topadi, butun menyuni emas).
 */
export function searchDishes(query: string): Dish[] {
  const words = tokens(query);
  if (words.length === 0) return [];

  return DISHES.filter((dish) => {
    const hay = tokens(
      `${dish.name} ${dish.category} ${dish.description} ${dish.keywords}`,
    );
    // Har bir so'z SO'Z BOSHIDAN mos kelishi kerak, qism-satr emas.
    //
    // Qism-satr bo'yicha qidirilganda "osh" so'rovi "kartoshka" ni ham
    // topardi — agent esa natijalar ro'yxatiga ishonadi va tasodifiy
    // taomni tavsiya qilib qo'yardi. Boshidan moslik "kabob" so'rovi
    // "kaboblar" ni topishiga xalaqit bermaydi.
    return words.every((w) => hay.some((t) => t.startsWith(w)));
  });
}

/**
 * Matnni so'zlarga ajratadi.
 *
 * Apostrof harfning bir qismi bo'lib qoladi (`sho'rva`, `lag'mon`,
 * `go'sht`), va uning turli ko'rinishlari bittaga keltiriladi —
 * klaviaturada yozilgani bilan manbadagisi ko'pincha farq qiladi.
 */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ`]/g, "'")
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);
}

/** Tiyin -> "35 000 so'm". */
export function sum(tiyin: number): string {
  return `${Math.round(tiyin / 100).toLocaleString("uz-UZ")} so'm`;
}
