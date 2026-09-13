import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build estático puro — sem SSR, sem edge functions.
// Output vai para dist/, que é o diretório apontado no Cloudflare Pages.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
