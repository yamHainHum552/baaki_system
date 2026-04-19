import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f6f1e8",
        ink: "#1f2937",
        khata: "#ab2e20",
        moss: "#39604f",
        line: "#d8cbb7",
        warm: "#fffaf2"
      },
      boxShadow: {
        ledger: "0 18px 40px rgba(74, 38, 10, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
