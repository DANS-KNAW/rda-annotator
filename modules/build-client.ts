import { defineWxtModule } from "wxt/modules";
import * as path from "path";
import * as ts from "typescript";

/**
 * WXT Module that triggers an external build process after WXT completes its build.
 * This allows us to transpile additional TypeScript files that aren't part of the
 * standard WXT entry points.
 */
export default defineWxtModule({
  name: "external-build",

  setup(wxt) {
    const runExternalBuild = async () => {
      const sourcePath = path.resolve(wxt.config.root, "client/boot.ts");
      const sourceDir = path.resolve(wxt.config.root, "client/");
      const outDir = path.resolve(
        wxt.config.root,
        wxt.config.outDir,
        "client/"
      );

      console.log("✔ Starting TypeScript compilation...");

      return new Promise<void>((resolve, reject) => {
        const compilerOptions: ts.CompilerOptions = {
          rootDir: sourceDir,
          outDir,
          allowJs: true,
          allowSyntheticDefaultImports: true,
          checkJs: true,
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: "preact",
          module: ts.ModuleKind.ES2020,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          noEmit: false,
          strict: true,
          target: ts.ScriptTarget.ES2021,
          useUnknownInCatchVariables: false,
          types: [],
        };

        const libPath = path.dirname(ts.getDefaultLibFilePath({}));
        const libs = ["es2021", "dom", "dom.iterable"].map((l) =>
          path.join(libPath, `lib.${l}.d.ts`)
        );

        const program = ts.createProgram(
          [sourcePath, ...libs],
          compilerOptions
        );
        const emitResult = program.emit();

        const allDiagnostics = ts
          .getPreEmitDiagnostics(program)
          .concat(emitResult.diagnostics);

        if (allDiagnostics.length > 0) {
          allDiagnostics.forEach((diagnostic) => {
            if (diagnostic.file) {
              const { line, character } = ts.getLineAndCharacterOfPosition(
                diagnostic.file,
                diagnostic.start!
              );
              const message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                "\n"
              );
              console.error(
                `${diagnostic.file.fileName} (${line + 1},${
                  character + 1
                }): ${message}`
              );
            } else {
              console.error(
                ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
              );
            }
          });
          reject("TypeScript compilation failed");
          return;
        }

        if (emitResult.emitSkipped) {
          reject("TypeScript compilation failed");
        } else {
          console.log("✔ TypeScript compilation completed successfully!");
          resolve();
        }
      });
    };

    let isDevServerRunning = false;
    wxt.hook("server:started", async () => {
      isDevServerRunning = true;
    });

    wxt.hook("server:closed", async () => {
      isDevServerRunning = false;
    });

    wxt.hook("build:done", async () => {
      if (!isDevServerRunning) {
        try {
          await runExternalBuild();
        } catch (error) {
          console.error("X Error during external build:", error);
          process.exit(1); // Hooks are none blocking, so we force exit.
        }
      }
    });

    if (wxt.config.command === "serve") {
      wxt.hook("build:done", async () => {
        if (isDevServerRunning) {
          try {
            console.log("REBUILD");
            await runExternalBuild();
          } catch (error) {
            console.error("X Error during dev rebuild:", error);
            process.exit(1); // Hooks are none blocking, so we force exit.
          }
        }
      });
    }
  },
});
