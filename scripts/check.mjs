#!/usr/bin/env node
/**
 * Ruxsatlar haqiqatan to'sadimi — tekshiruv.
 *
 * ┌─ NEGA BU SKRIPT BOR ───────────────────────────────────────────────┐
 * Bu loyihaning butun da'vosi bitta jumlada: o'chirilgan imkoniyat
 * SERVERDA to'siladi. Da'voni sinamaslik uni fikrga aylantiradi.
 *
 * Va bu quruq ehtiyotkorlik emas. Xuddi shunday tekshiruv uchta
 * haqiqiy teshikni ochgan: `PUT /api/permissions` orqali agent o'ziga
 * `place_order` bera olardi, `GET /api/cart` esa `cart` o'chiq
 * bo'lsa ham savatni qaytarardi, `checkout` imkoniyati umuman
 * tekshirilmasdi. Uchalasi ham ekranda "blocked" deb turardi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ HOLAT QANDAY TAYYORLANADI ────────────────────────────────────────┐
 * Ruxsatni o'zgartiradigan HTTP yo'li ATAYLAB yo'q (aynan shu teshik
 * yopilgan). Shuning uchun skript kerakli holatni imzolangan cookie
 * yasab beradi — serverning o'zi ishlatadigan kalit bilan.
 *
 * Ya'ni bu skript ishlashining o'zi imzo ishlashini ham ko'rsatadi:
 * imzo noto'g'ri bo'lsa server holatni e'tiborsiz qoldiradi va
 * tekshiruvlar yiqiladi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Ishlatish:
 *   npm run check                       # http://localhost:3000
 *   npm run check -- https://your.app   # boshqa manzil
 */

import { createHmac } from "node:crypto";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.SESSION_SECRET ?? "ondex-webmcp-public-demo-key";

const ALL_ON = {
  browse: true,
  cart: true,
  checkout: true,
  place_order: true,
  orders: true,
};
const CART = { restaurantId: "r-avigo", lines: [{ dishId: "d-osh", qty: 2 }] };
/** Katalogdagi haqiqiy narx: 35 000 so'm x2 + 8 000 yetkazish. */
const EXPECTED_TOTAL = 3500000 * 2 + 800000;

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function cookieFor(state) {
  const payload = b64url(JSON.stringify(state));
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `ondex_webmcp_state=${payload}.${sig}`;
}

function session({ permissions = ALL_ON, cart = CART, orders = [] } = {}) {
  return cookieFor({ cart, orders, permissions, activity: [] });
}

async function call(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      cookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* sahifalar HTML qaytaradi */
  }
  return { status: res.status, text, json };
}

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "  ok  " : "  FAIL"}  ${label.padEnd(52)} ${actual}${
      ok ? "" : ` (expected ${expected})`
    }`,
  );
}

const off = (cap) => ({ ...ALL_ON, [cap]: false });

async function main() {
  console.log(`\nChecking ${BASE}\n`);

  console.log("Every capability blocks its own tools");
  {
    const s = session({ permissions: off("browse") });
    check("browse off -> search_dishes", (await call(s, "GET", "/api/catalog?q=osh")).status, 403);
    check("browse off -> list_restaurants", (await call(s, "GET", "/api/catalog")).status, 403);
  }
  {
    const s = session({ permissions: off("cart") });
    check("cart off -> add_to_cart", (await call(s, "POST", "/api/cart", { dishId: "d-osh", qty: 1 })).status, 403);
    check("cart off -> view_cart", (await call(s, "GET", "/api/cart")).status, 403);
  }
  {
    const s = session({ permissions: off("checkout") });
    check("checkout off -> open_checkout", (await call(s, "GET", "/api/checkout")).status, 403);
  }
  {
    const s = session({ permissions: off("orders") });
    check("orders off -> my_orders", (await call(s, "GET", "/api/orders")).status, 403);
  }
  {
    const s = session({ permissions: off("place_order") });
    check("place_order off -> agent order", (await call(s, "POST", "/api/orders", { paymentMethod: "cash" })).status, 403);
  }

  console.log("\nLimits that hold even with every permission granted");
  {
    const s = session();
    check("agent may not pay by card", (await call(s, "POST", "/api/orders", { paymentMethod: "card" })).status, 403);
    check("agent may pay cash", (await call(session(), "POST", "/api/orders", { paymentMethod: "cash" })).status, 200);
    check("empty cart is 400, not 403", (await call(session({ cart: { restaurantId: null, lines: [] } }), "POST", "/api/orders", { paymentMethod: "cash" })).status, 400);
    check("no HTTP route grants permissions", (await call(s, "PUT", "/api/permissions", { name: "place_order", enabled: true })).status, 405);
  }

  console.log("\nThe catalog decides what exists and what it costs");
  {
    const s = session({ cart: { restaurantId: null, lines: [] } });
    check("invented dish id rejected", (await call(s, "POST", "/api/cart", { dishId: "d-does-not-exist", qty: 1 })).status, 400);
    check("dish that is sold out rejected", (await call(s, "POST", "/api/cart", { dishId: "d-gumma", qty: 1 })).status, 400);
    check("dish from a closed restaurant rejected", (await call(s, "POST", "/api/cart", { dishId: "d-lagmon", qty: 1 })).status, 400);

    // Narx mijozdan KELMAYDI: cookie'da ham, so'rovda ham narx yo'q,
    // server uni katalogdan qidiradi.
    const cart = await call(session(), "GET", "/api/cart");
    check("total comes from the catalog", cart.json?.totalTiyin, EXPECTED_TOTAL);
  }

  console.log("\nA tampered cookie is discarded, not trusted");
  {
    // Imzoni saqlab, ichidagi ruxsatni o'zgartiramiz.
    const good = session({ permissions: { ...ALL_ON, place_order: true } });
    const [name, value] = good.split("=");
    const dot = value.lastIndexOf(".");
    const json = Buffer.from(value.slice(0, dot), "base64url").toString();
    const forged = json.replace('"place_order":true', '"place_order":false');
    const tampered = `${name}=${Buffer.from(forged).toString("base64url")}.${value.slice(dot + 1)}`;

    const r = await call(tampered, "GET", "/api/permissions");
    // Rad etilsa holat standartga qaytadi, ya'ni place_order = false.
    check("forged permissions ignored", r.json?.permissions?.place_order, false);
    // Va savat ham yo'qoladi — butun holat e'tiborsiz qoldirilgan.
    check("forged state discarded entirely", (await call(tampered, "GET", "/api/cart")).json?.items?.length, 0);
  }

  console.log("\nThe screen shows the same state the API does");
  {
    const s = session();
    const page = await call(s, "GET", "/cart");
    check("cart page renders the cart", page.text.includes("Osh"), true);
    check("cart page is not empty", page.text.includes("The cart is empty"), false);
  }

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\nCould not run the checks: ${e.message}`);
  console.error("Is the server running? Try: npm run build && npm start\n");
  process.exit(1);
});
