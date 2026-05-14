/**
 * Single source of truth for CLI identity strings.
 *
 * `package.json` is the canonical home for version + description. This
 * module re-exports them so `src/cli.ts`, `src/commands/status.ts`, and
 * (where added) any other consumer share ONE value · eliminating drift
 * between `package.json` · `freeside --version` · `freeside --help`
 * header · npm registry · github description.
 *
 * Bun and node>=22 support JSON import attributes natively.
 */
import pkg from '../package.json' with { type: 'json' }

export const VERSION: string = pkg.version
export const DESCRIPTION: string = pkg.description
