import { realpathSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

const appRoot = realpathSync(fileURLToPath(new URL(".", import.meta.url)));
const workspaceRoot = realpathSync(fileURLToPath(new URL("../..", import.meta.url)));

export default defineConfig({
  root: appRoot,
  envDir: workspaceRoot,
  publicDir: fileURLToPath(new URL("../../assets", import.meta.url)),
  optimizeDeps: {
    noDiscovery: true
  },
  plugins: [
    {
      name: "strip-bad-entities-sourcemap",
      transform(code, id) {
        if (!id.includes("/node_modules/markdown-it/node_modules/entities/lib/esm/")) {
          return null;
        }

        return {
          code: code.replace(/\n\/\/# sourceMappingURL=.*$/m, ""),
          map: null
        };
      }
    },
    vue(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@zrb/avatar-runtime": fileURLToPath(new URL("../../packages/avatar-runtime/src/index.ts", import.meta.url)),
      "@zrb/shared-api": fileURLToPath(new URL("../../packages/shared-api/src/index.ts", import.meta.url)),
      "@zrb/shared-types": fileURLToPath(new URL("../../packages/shared-types/src/index.ts", import.meta.url)),
      "@zrb/shared-utils": fileURLToPath(new URL("../../packages/shared-utils/src/index.ts", import.meta.url)),
      "@zrb/ui": fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url))
    }
  },
  server: {
    fs: {
      allow: [workspaceRoot]
    },
    port: 5173
  }
});
