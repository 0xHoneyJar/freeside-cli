/**
 * Shared config-file resolution.
 *
 * Resolution order (first hit wins):
 *   1. env LOA_FREESIDE_CONFIG_DIR (operator override · prepended directory)
 *   2. package-root via import.meta.url (works under bun dev + node dist)
 *   3. cwd-relative (fallback for tests + ad-hoc runs)
 *
 * Throws with a clear searched-path list when no candidate exists.
 *
 * Single source per bridgebuilder PR #12 MEDIUM M-1 (was duplicated
 * verbatim between manifest.ts and registry.ts).
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export function resolveConfigPath(filename: string, importMetaUrl: string): string {
  const envOverride = process.env.LOA_FREESIDE_CONFIG_DIR
  if (envOverride) {
    const p = join(envOverride, filename)
    if (existsSync(p)) return p
  }
  const here = dirname(fileURLToPath(importMetaUrl))
  // src/<sub>/foo.ts → ../../config/<file>
  // dist/bin/freeside.js → ../../config/<file>
  const fromModule = join(here, '..', '..', 'config', filename)
  if (existsSync(fromModule)) return fromModule
  const fromCwd = join(process.cwd(), 'config', filename)
  if (existsSync(fromCwd)) return fromCwd
  throw new Error(
    `[freeside-cli] config/${filename} not found. Searched: env LOA_FREESIDE_CONFIG_DIR, ${fromModule}, ${fromCwd}`,
  )
}
