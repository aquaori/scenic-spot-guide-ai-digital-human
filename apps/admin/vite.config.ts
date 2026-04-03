import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  publicDir: fileURLToPath(new URL("../../packages/live2d-assets/public", import.meta.url)),
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@zrb/live2d-runtime": fileURLToPath(new URL("../../packages/live2d-runtime/src/index.ts", import.meta.url)),
      "@zrb/shared-api": fileURLToPath(new URL("../../packages/shared-api/src/index.ts", import.meta.url)),
      "@zrb/shared-types": fileURLToPath(new URL("../../packages/shared-types/src/index.ts", import.meta.url)),
      "@zrb/shared-utils": fileURLToPath(new URL("../../packages/shared-utils/src/index.ts", import.meta.url)),
      "@zrb/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 5174
  }
});
