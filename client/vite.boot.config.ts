import { defineConfig } from "vite";
import { resolve } from "path";

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
        boot: resolve(__dirname, "boot/index.ts"),
      },
      output: {
        entryFileNames: "client/[name].js",
        format: "iife",
        sourcemap: false,
      },
      preserveEntrySignatures: false,
      treeshake: true,
    },
  },
});
