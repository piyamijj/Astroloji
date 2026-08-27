/**
 * Ambient module declaration for 'swisseph'.
 *
 * 'swisseph' is a community-maintained native (C/C++) Node.js addon that wraps the
 * Swiss Ephemeris library. It ships without official TypeScript type definitions,
 * and its exact function surface (callback vs. synchronous return, exact result
 * object shapes) can vary slightly between published versions/forks.
 *
 * To keep the rest of the codebase type-safe while still allowing TypeScript to
 * compile against this package, we declare the module loosely as `any` here.
 * All actual usage is centralized and defensively handled in lib/vedic-calc.ts.
 */
declare module "swisseph";