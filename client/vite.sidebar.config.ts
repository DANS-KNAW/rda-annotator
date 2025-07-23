import { defineConfig } from "vite";
import { resolve } from "path";
import terser from "@rollup/plugin-terser";
import babel from "vite-plugin-babel";

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not defined`);
  }
  return value;
};

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          [
            "@babel/preset-typescript",
            {
              // Allow TypeScript syntax
              allowDeclareFields: true,
              // Only transform imports, not types
              onlyRemoveTypeImports: true,
            },
          ],
        ],
        plugins: ["inject-args"],
      },
      // Apply to JavaScript and TypeScript files in the client directory.
      filter: /client\/.*\.(jsx?|tsx?)$/,
    }),
  ],
  build: {
    outDir: getRequiredEnvVar("WXT_OUT_DIR"),
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, "sidebar/index.tsx"),
      },
      output: {
        entryFileNames: "client/scripts/[name].js",
        format: "es",
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
