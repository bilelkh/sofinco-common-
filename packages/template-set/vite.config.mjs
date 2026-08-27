import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { transform } from "esbuild";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { sofincoReactAliases } from "sofinco-react/aliases";

const INLINE_SUFFIX = "?inline-script";

function inlineScript() {
  return {
    name: "inline-script",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!source.endsWith(INLINE_SUFFIX)) return null;
      const clean = source.slice(0, -INLINE_SUFFIX.length);
      const resolved = await this.resolve(clean, importer, { skipSelf: true });
      return resolved ? resolved.id + INLINE_SUFFIX : null;
    },
    async load(id) {
      if (!id.endsWith(INLINE_SUFFIX)) return null;
      const file = id.slice(0, -INLINE_SUFFIX.length);
      const src = await fs.readFile(file, "utf8");
      const { code } = await transform(src, {
        loader: "ts",
        minify: true,
        target: "es2017",
        format: "iife",
      });
      this.addWatchFile(file);
      return `export default ${JSON.stringify(code.trimEnd())};`;
    },
  };
}

export default defineConfig({
  resolve: {
    // Ces alias servent UNIQUEMENT à compiler les sources internes du design system, qui
    // s'importent entre elles via `@shared/…`, `@b2c/…`, `@common/…`. La carte est fournie
    // et maintenue par `sofinco-react` : une réorganisation de son arborescence ne demande
    // aucune modification ici. Le code de ce module, lui, n'importe que `sofinco-react`
    // (racine) ou `sofinco-react/styles/*`.
    alias: { ...sofincoReactAliases },
  },
  build: {
    rollupOptions: {
      output: {
        banner: (chunk) => {
          if (chunk.fileName.startsWith("server/")) {
            return "if(typeof globalThis.queueMicrotask!=='function'){globalThis.queueMicrotask=function(cb){Promise.resolve().then(cb).catch(function(e){setTimeout(function(){throw e},0)})}}";
          }
          return "";
        },
      },
      onwarn(warning, defaultHandler) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes('"use client"')) {
          return;
        }
        if (
          warning.code === "SOURCEMAP_ERROR" &&
          warning.message.includes("Can't resolve original location")
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  plugins: [
    inlineScript(),
    jahia({
      // Default values:
      // inputDir: "src",
      // outputDir: "dist",
      // assetsDir: "assets",
      // client: {
      //   inputGlob: "**/*.client.{jsx,tsx}",
      //   outputDir: "client",
      // },
      // server: {
      //   inputGlob: "**/*.server.{jsx,tsx}",
      //   outputFile: "server/index.js",
      // },

      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
  ],
});
