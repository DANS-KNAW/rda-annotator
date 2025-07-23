import { defineWxtModule } from "wxt/modules";
import { execSync } from "child_process";
import { buildCSS } from "../tools/buildcss";
import annotatorTailwindConfig from "../tailwind-annotator.config.js";
import sidebarTailwindConfig from "../tailwind-sidebar.config.js";
import tailwindConfig from "../tailwind.config.js";

const configs = [
  "vite.boot.config.ts",
  "vite.annotator.config.ts",
  "vite.sidebar.config.ts",
];

/**
 * WXT Module that triggers an external build process after WXT completes its build.
 * This allows us to transpile additional TypeScript files that aren't part of the
 * standard WXT entry points.
 */
export default defineWxtModule({
  setup(wxt) {
    wxt.hook("build:done", async () => {
      for (const config of configs) {
        const buildName = config.replace("vite.", "").replace(".config.ts", "");
        console.log(`📦 Building ${buildName}...`);

        try {
          execSync(
            `cd ${wxt.config.root}/client && vite build --config ${config}`,
            {
              stdio: "inherit",
              env: { ...process.env, WXT_OUT_DIR: wxt.config.outDir },
            }
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to build ${buildName}:`, message);
          process.exit(1);
        }
      }

      const stylesOutDir = wxt.config.outDir + "/client/styles";

      buildCSS(["./client/styles/annotator/annotator.scss"], {
        tailwindConfig: annotatorTailwindConfig as any,
        outDir: stylesOutDir,
      });

      buildCSS(
        [
          // sidebar styles (with tailwind)
          "./client/styles/sidebar/sidebar.scss",
        ],
        {
          tailwindConfig: sidebarTailwindConfig as any,
          outDir: stylesOutDir,
        }
      );

      buildCSS(
        [
          // styles processed by tailwind, used by annotator
          "./client/styles/annotator/highlights.scss",
          // other styles used by annotator (standalone)
          "./client/styles/annotator/pdfjs-overrides.scss",

          // Vendor
          // "./node_modules/katex/dist/katex.min.css",
        ],
        {
          tailwindConfig: tailwindConfig as any,
          outDir: stylesOutDir,
        }
      );
    });
  },
});
