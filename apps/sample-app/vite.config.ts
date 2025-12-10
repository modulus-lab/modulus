import modulusVitePlugin from "@modulus-labs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    modulusVitePlugin({
      mocksDir: path.resolve("./src/mocks"),
    }),
    react(),
  ]
});
