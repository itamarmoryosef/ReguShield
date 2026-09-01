import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Node resolves ESM specifiers literally, while the app source uses bundler
 * style imports ("./rtl", "@/lib/errors"). These hooks let the check scripts
 * import the real TypeScript modules without a build step.
 */

const ROOT = process.cwd();
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(basePath) {
  for (const extension of EXTENSIONS) {
    const candidate = `${basePath}${extension}`;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = firstExisting(path.join(ROOT, specifier.slice(2)));
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const parentPath = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : ROOT;
    const resolved = firstExisting(path.resolve(parentPath, specifier));
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
