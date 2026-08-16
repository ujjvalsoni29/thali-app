import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Port 5473 — deliberately disjoint from Maximus (5373), Keystone (5273/8100/5432) and
// Pulse (5173/8000/3306), so all four run at once. There is no separate API port: the
// Worker serves the SPA and /api/* on one origin, which is why this repo has no CORS
// configuration anywhere. See thali-app/CLAUDE.md §8.
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: { port: 5473, strictPort: true },
});
