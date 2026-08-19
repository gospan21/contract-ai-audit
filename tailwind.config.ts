import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 60px -30px rgba(15, 23, 42, 0.35)",
        glow: "0 0 0 1px rgba(59, 130, 246, 0.08), 0 24px 80px -40px rgba(37, 99, 235, 0.75)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.12) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
