# OnDex — an agent-native storefront (WebMCP)

**Live demo:** _(deployed URL goes here)_
**Built for:** OpenAI WebMCP Hackathon, 2026

A food-ordering storefront where the browser agent is a **first-class user of
the page**, not a screen-scraper. The site publishes its own actions through
[WebMCP](https://github.com/webmachinelearning/webmcp) — `document.modelContext`
— so an agent can search a menu, fill a cart and reach checkout by calling the
site's real functions.

The interesting part is not that the agent can act. It is **what stops it.**

---

## The idea: permission is the product

Give an agent tools and it will use all of them. Every WebMCP demo can add to a
cart. The open question is the one a real merchant has to answer before shipping
this: *what happens when the agent decides to buy something?*

This app answers it with three rules, and they are the reason the code is
shaped the way it is:

**1. The user decides what the agent may do — per capability, on the server.**

`/permissions` has five switches: browse, cart, checkout, place orders, read
orders. They are stored in the session on the server and checked inside every
tool handler. Turning one off does not hide a button; it makes the API return
`403`. An agent that ignores the tool description and calls the endpoint
directly gets the same refusal.

```
lib/server-state.ts    allowed(cap)  ->  every route re-checks
app/api/*/route.ts     403 before any state changes
```

**2. `place_order` is off by default, and agents may only pay cash.**

An agent that can silently charge a card is a liability, not a feature. So the
one irreversible action starts disabled, and even when the user enables it the
server refuses `paymentMethod: "card"` from an agent. Card orders always come
back to the human's button.

**3. The human path and the agent path are physically different code.**

```
human  ->  Server Action  (app/checkout/actions.ts)  ->  placeOrder(..., "human")
agent  ->  POST /api/orders                          ->  placeOrder(..., "agent")
```

An agent cannot invoke a Server Action, so it cannot forge a human confirmation.
Every order carries who placed it, and the orders list shows it: *by you* /
*by agent*. Attribution is not decoration — it is what makes an agent's mistake
auditable after the fact.

A fourth, smaller rule: **prices never come from the agent.** Tools take dish
ids and quantities; the server looks up the price. There is no argument an agent
can pass that changes what something costs.

---

## The nine tools

Registered in `app/webmcp-tools.tsx` via `document.modelContext.registerTool`,
and unregistered on unmount through an `AbortController`.

| Tool | Capability | Notes |
|---|---|---|
| `search_dishes` | browse | Free-text search across all menus |
| `list_restaurants` | browse | With cuisine, rating, delivery time |
| `open_menu` | browse | Navigates the page too — the user sees where the agent went |
| `add_to_cart` | cart | Validates the dish id; server sets the price |
| `view_cart` | cart | Lines + total |
| `open_checkout` | checkout | Navigates; does **not** order |
| `place_order` | place_order | Off by default; cash only for agents |
| `my_orders` | orders | History with `placedBy` |
| `track_order` | orders | Status of one order |

Navigating tools deliberately move the browser. The user watching the screen
should be able to see what the agent is doing, not discover it afterwards in a
receipt.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

**No API keys. No database. Nothing to configure.** The catalog is a constant
(`lib/catalog.ts`), and your session — cart, permissions, orders — lives in a
signed cookie (`lib/server-state.ts`). Nothing to leak, which is also why this
repo can be public.

The cookie is `httpOnly`, so no script on the page — the agent's included — can
read or alter it, and the server verifies an HMAC on every read, so a tampered
cookie is discarded rather than trusted. That matters here specifically because
the cookie carries the permissions: without the signature, "enforced on the
server" would be a slogan rather than a fact.

Set `SESSION_SECRET` in a real deployment. Without it the app falls back to a
key committed in this repo, which is fine for a public demo with no accounts
and no money in it, and means `git clone && npm install && npm run dev` works
with nothing to set up.

<sup>Earlier revisions kept sessions in a server-side `Map`. That works on one
long-lived process and fails quietly on serverless, where route handlers and
page renders are separate functions with separate memory: the API reported a
full cart while the page rendered an empty one. The cookie removes the shared
memory assumption entirely.</sup>

### Trying it with an agent

- **ChatGPT desktop app** — open the site in its in-app browser, which supports
  WebMCP by default. Make sure the conversation is in **ChatGPT** mode; Codex
  does not get the page's tools and will fall back to searching the web.
- **Chrome 149+** — enable `chrome://flags/#enable-webmcp-testing`, restart,
  then open the site.

**Open `/agent` first.** It says whether this browser exposes
`document.modelContext`, lists the nine tools it registered, and marks each one
allowed or blocked. Without it a browser lacking WebMCP just renders an
ordinary shop and gives no hint that the agent half is missing.

Things worth asking the agent:

> "Find something spicy and add two of them to my cart."
> "Order it." — *refused: `place_order` is disabled.*
>
> Enable **Place orders** in `/permissions`, ask again — it works, as cash.
> Ask it to pay by card — *refused, on the server.*

That last exchange is the demo. The agent is not being polite; it is being
stopped.

---

## What is new, and what is not

Per the hackathon rules, plainly:

**Written for this hackathon — all of it in this repository.** Every file here
is new: the WebMCP tool layer, the permission model, the split human/agent
order paths, the storefront UI, and the demo catalog. This repo has no
dependency on anything below.

**Pre-existing, and intentionally not in this repo.** OnDex is a production
food-delivery platform I run in Chust, Uzbekistan (Go backend, Flutter apps),
with an in-app AI assistant called **Shaddiy**. The server-enforced
per-capability permission model demonstrated here is an idea I first shipped
there, and this hackathon entry is a clean-room WebMCP restatement of it — no
production code, credentials, business logic or customer data were copied into
this repository, and none are needed to run it.

So: the *concept* has a history; the *code* is new.

---

## Stack

Next.js 16 (App Router, Server Actions), React 19, TypeScript strict,
Tailwind CSS. Strict CSP in `next.config.ts`.

## License

MIT — see [LICENSE](./LICENSE).
