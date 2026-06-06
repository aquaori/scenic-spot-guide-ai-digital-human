import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const mockServiceWorkerUrl = new URL("./public/mockServiceWorker.js", import.meta.url);
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
      name: "admin-msw-worker",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] !== "/mockServiceWorker.js") {
            next();
            return;
          }

          res.setHeader("Content-Type", "text/javascript");
          res.end(readFileSync(mockServiceWorkerUrl));
        });
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
    port: 5174
  }
});
