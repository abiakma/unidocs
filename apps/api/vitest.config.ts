import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC is needed because esbuild does not emit the decorator metadata NestJS uses for DI.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
