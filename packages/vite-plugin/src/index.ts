import express from "express";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { build } from "vite";

export function modulusVitePlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "modulus-vite-plugin",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(server: ViteDevServer) {
      const app = express();
      server.middlewares.use(app);
    },

    async closeBundle() {
      if (config.command !== "build") return;
      await buildServerCode(config);
    },
  };
}

async function buildServerCode(config: ResolvedConfig): Promise<void> {
  try {
    if ((config as any).__MODULUS_SERVER_BUILD__) return;
    console.log("[modulus-vite-plugin] Building server...");
    await build(getConfigs(config));
    console.log("[modulus-vite-plugin] Server build complete");
  } catch (error) {
    console.error("[modulus-vite-plugin] Server build failed:", error);
    throw error;
  }
}

function getConfigs(config: ResolvedConfig): any {
  return {
    build: {
      target: "esnext",
      outDir: config.build.outDir,
      ssr: 'src/server/main.js',
      minify: true,
      sourcemap: false,
      emptyOutDir: false,
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: 'server.js'
        }
      }
    },
    ssr: {
      noExternal: true
    },
    __MODULUS_SERVER_BUILD__: true,
  };
}

export default modulusVitePlugin;
