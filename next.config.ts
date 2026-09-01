import type { NextConfig } from "next";

/**
 * Xavfsizlik sarlavhalari.
 *
 * WebMCP agenti sahifaning O'ZIDA ishlaydi, ya'ni sahifaga inyeksiya
 * qilingan begona skript agentga ochilgan amallarni ham chaqira oladi.
 * Shu sabab CSP bu yerda "yaxshi amaliyot" emas, to'g'ridan-to'g'ri
 * himoya: tashqi skript umuman yuklanmaydi.
 */
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Next.js App Router ishga tushirish skriptlarini inline qo'yadi;
  // `unsafe-eval` faqat dev'da (HMR).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), payment=(), usb=(), geolocation=()",
      },
    ];
    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
