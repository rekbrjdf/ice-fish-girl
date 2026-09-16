import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/ice-fish-girl/" : "/",
  plugins: [react()],
  server: { port: 5173 },
}));
