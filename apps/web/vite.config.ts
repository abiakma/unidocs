import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The repository root holds the shared .env file.
const ENV_DIR = "../..";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, "VITE_");
  return {
    envDir: ENV_DIR,
    plugins: [react(), tailwindcss()],
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      // Same-origin API calls keep the session cookie first-party.
      proxy: {
        "/api": { target: env.VITE_API_PROXY_TARGET || "http://localhost:3000", changeOrigin: false },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
