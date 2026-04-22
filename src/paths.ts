/**
 * Runtime-safe directory of the currently executing entry-point script.
 *
 * When the bundle is produced by Bun, the CJS `__dirname` is replaced at
 * build time with the *source* directory, which is wrong at runtime.
 * `import.meta.dirname` (available in Node ≥ 21.2 and Bun) resolves
 * correctly at runtime in ESM bundles.
 */
export const SCRIPT_DIR: string = import.meta.dirname
