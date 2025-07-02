import { defineConfig } from "vite";
import * as path from "path";
import terser from "@rollup/plugin-terser";
import { createHash } from "crypto";
import packageJson from "../package.json";

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not defined`);
  }
  return value;
};

const generateCacheBuster = () => {
  const packageVersion = packageJson.version;
  const buildTime = Date.now();
  const files = ["script/annotator.js", "script/annotator.js.map"];
  const cacheBuster: Record<string, string> = {};

  files.forEach((file, index) => {
    const hash = createHash("sha1");
    hash.update(
      file + buildTime.toString() + packageVersion + index.toString()
    );
    const hashSuffix = hash.digest("hex").slice(0, 8);
    cacheBuster[file] = `${file}?${hashSuffix}`;
  });

  return cacheBuster;
};

export default defineConfig({
  define: {
    __CACHE_BUSTER__: generateCacheBuster(),
  },
  build: {
    outDir: getRequiredEnvVar("WXT_OUT_DIR"),
    rollupOptions: {
      input: {
        boot: path.resolve(__dirname, "boot/index.ts"),
      },
      output: {
        entryFileNames: "client/[name].js",
        format: "iife",
        sourcemap: false,
      },
      preserveEntrySignatures: false,
      treeshake: true,
      plugins: [terser()],
    },
  },
  envDir: path.resolve(__dirname, "../"),
  envPrefix: ["VITE_", "WXT_"],
});
