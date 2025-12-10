import express from "express";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { build } from "vite";
import { loadMockRouters } from "./mockLoader.ts";

type Options = {
  mocksDir: string;
};

export function modulusVitePlugin(opts: Options): Plugin {
  let config: ResolvedConfig;

  // const mockRouter = await loadMockRouters(opts.mocksDir);

  return {
    name: "modulus-vite-plugin",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async configureServer(server: ViteDevServer) {
      const app = express();
      app.use((req, _res, next) => {
        console.log(`[modulus-vite-plugin] ${JSON.stringify(req.method)} ${req.headers["User-Agent"]}`);
        next();
      })
      app.use("/modulus/mocks", await loadMockRouters(opts.mocksDir));
      app.use((_req, _res, next) => {
        console.log(`[modulus-vite-plugin] FALLBACK`);
        next();
      })
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
      ssr: "src/server/main.js",
      minify: true,
      sourcemap: false,
      emptyOutDir: false,
      rollupOptions: {
        output: {
          format: "es",
          entryFileNames: "server.js",
        },
      },
    },
    ssr: {
      noExternal: true,
    },
    __MODULUS_SERVER_BUILD__: true,
  };
}

export default modulusVitePlugin;
