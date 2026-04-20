import type { Config } from "tailwindcss";

const config: Config = {
  /** Scan all of `src/` so hooks, scripts, and new folders never drop utilities from the JIT bundle. */
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
