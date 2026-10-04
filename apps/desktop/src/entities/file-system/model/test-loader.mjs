import { registerHooks } from "node:module";

// Node's type stripping does not resolve the extensionless imports used by
// the linked workspace packages; Vite resolves them in the application.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
