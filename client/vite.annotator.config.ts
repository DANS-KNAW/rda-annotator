import { defineConfig } from "vite";
import { resolve } from "path";
import terser from "@rollup/plugin-terser";

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not defined`);
  }
  return value;
};

export default defineConfig({
  build: {
    outDir: getRequiredEnvVar("WXT_OUT_DIR"),
    rollupOptions: {
      input: {
        annotator: resolve(__dirname, "annotator/index.ts"),
      },
      output: {
        entryFileNames: "client/scripts/[name].js",
        format: "iife",
        sourcemap: true,
      },
      preserveEntrySignatures: false,
      treeshake: true,
      plugins: [terser()],
    },
  },
  envDir: resolve(__dirname, "../"),
  envPrefix: ["VITE_", "WXT_"],
});
