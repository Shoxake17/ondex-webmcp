import type { Metadata, Viewport } from "next";
import Link from "next/link";

import "./globals.css";
import { AgentBarProvider } from "./agent-bar";
import WebMcpTools from "./webmcp-tools";

export const metadata: Metadata = {
  title: "OnDex — agent-native food ordering (WebMCP)",
  description:
    "Order food by talking to your browser agent. Every capability is a " +
    "switch you control, enforced on the server, and every action is shown " +
    "on screen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/", label: "Restaurants" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
  { href: "/permissions", label: "Permissions" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AgentBarProvider>
          {/* Amallar butun ilova uchun bir marta ro'yxatga olinadi:
              agent sahifadan sahifaga o'tganda ular yo'qolmasligi
              kerak. */}
          <WebMcpTools />

          <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
              <Link href="/" className="text-[17px] font-extrabold tracking-tight">
                <span>On</span>
                <span className="text-brand">Dex</span>
              </Link>
              <nav className="flex items-center gap-4 text-[13px]">
                {NAV.slice(1).map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="text-neutral-600 transition-colors hover:text-brand"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-3xl px-4 pb-24 pt-5">{children}</main>
        </AgentBarProvider>
      </body>
    </html>
  );
}
