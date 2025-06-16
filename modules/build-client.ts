import { defineWxtModule } from "wxt/modules";
import { execSync } from "child_process";

const configs = ["vite.boot.config.ts"];

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
    });
  },
});
