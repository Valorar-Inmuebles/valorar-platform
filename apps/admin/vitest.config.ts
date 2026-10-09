import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      react: fileURLToPath(
        new URL("../../node_modules/react", import.meta.url),
      ),
      "react-dom": fileURLToPath(
        new URL("../../node_modules/react-dom", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    root: fileURLToPath(new URL(".", import.meta.url)),
    include: ["lib/**/*.spec.ts"],
  },
});
