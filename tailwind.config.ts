import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // OnDex brend rangi.
        brand: { DEFAULT: "#F4511E", light: "#FF7043" },
      },
    },
  },
  plugins: [],
} satisfies Config;
