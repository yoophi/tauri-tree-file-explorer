import path from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;
const explorerKit = path.resolve(__dirname, "../../../explorer-kit");

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Workspace packages ship raw .tsx source (no build step); keep them out of
  // the dependency pre-bundler so Vite transforms them like app code.
  optimizeDeps: {
    exclude: [
      "@yoophi/explorer-core",
      "@yoophi/file-list",
      "@yoophi/file-tree",
      "@yoophi/scan-client",
      "@yoophi/settings-core",
      "@yoophi/settings-ui",
      "@yoophi/ui-radix",
    ],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(__dirname), explorerKit],
    },
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
