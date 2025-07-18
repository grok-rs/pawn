import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      "@dto": path.resolve(__dirname, "./src/dto"),
    },
  },

  optimizeDeps: {
    // Include Tauri API dependencies for proper pre-bundling
    include: [
      "@tauri-apps/api/core",
      "@tauri-apps/api/event", 
      "@tauri-apps/api/webviewWindow"
    ],
    // Exclude auto-generated bindings from optimization to prevent conflicts
    exclude: ["./src/dto/bindings.ts", "./src/dto/bindings"],
    // Force Vite to handle TS files properly
    esbuildOptions: {
      target: 'es2020'
    }
  },

  // Improve module resolution for auto-generated files
  build: {
    target: 'es2020',
    rollupOptions: {
      external: (id) => {
        // Don't externalize our bindings
        return false;
      }
    }
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
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
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
