/**
 * Single source of truth for the CLI version.
 *
 * `package.json` is the canonical version. This module re-exports it so
 * `src/cli.ts` and `src/commands/status.ts` consume one value, eliminating
 * the drift hazard from three hardcoded strings.
 *
 * Bun and node>=22 support JSON import attributes natively.
 */
import pkg from '../package.json' with { type: 'json' }

export const VERSION: string = pkg.version
