import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  server: { host: "localhost", port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**", "**/crates/**", "**/target/**"] } },
  build: { outDir: "dist-tagma", rollupOptions: { input: "tagma.html" }, target: ["es2022", "safari15"] },
});
