/**
 * Zones manifest — the typed-port surfaces Freeside exposes as contracts.
 *
 * A zone is a hexagonal seam Freeside contracts on. Teams deploying on
 * Freeside pick the zones they need and honor the port + schema.
 *
 * Substrate (vercel/railway/aws/etc) lives in the live adapter, not the
 * zone itself. Sovereign infra is an option, not a requirement.
 *
 * S3.T1 · S3.T2 (Substrate Liberation): the canonical data ships at
 * `config/zones.yaml` (operator-editable · no rebuild required). This
 * module defines the Zod ZoneSchema, loads the yaml at startup, and
 * exports the validated array. Schema drift between yaml and code
 * fails fast with a clear Zod error.
 *
 * Operator-override path: `~/.freeside/zones.yaml` (future · v0.3+)
 *
 * Doctrine: [[freeside-modules-as-installables]] +
 * [[cli-as-substrate-construct-as-lens]] + honeycomb/effect-substrate.
 */
import { z } from 'incur'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse as parseYaml } from 'yaml'

export const zoneStatusSchema = z.enum(['active', 'draft', 'aspirational', 'extracted'])
export type ZoneStatus = z.infer<typeof zoneStatusSchema>

export const substrateSchema = z.enum([
  'vercel',
  'railway',
  'aws',
  'cloudflare',
  'discord-api',
  'self-hosted',
  'tbd',
])
export type Substrate = z.infer<typeof substrateSchema>

export const liveAdapterSchema = z.object({
  name: z.string(),
  substrate: substrateSchema,
  package: z.string().optional(),
  notes: z.string().optional(),
})
export type LiveAdapter = z.infer<typeof liveAdapterSchema>

export const zoneSchema = z.object({
  id: z.string(),
  description: z.string(),
  ports: z.array(z.string()),
  schemas: z.array(z.string()),
  home: z.string(),
  adapters: z.array(liveAdapterSchema),
  status: zoneStatusSchema,
  consumers: z.array(z.string()),
  tiering: z
    .object({
      free: z.string(),
      managed: z.string().optional(),
    })
    .optional(),
  gaps: z.array(z.string()).optional(),
})
export type Zone = z.infer<typeof zoneSchema>

const zonesFileSchema = z.object({
  zones: z.array(zoneSchema),
})

/**
 * Resolve config/zones.yaml relative to the package root.
 * Works under:
 *   - `bun run src/bin/freeside.ts` (dev · cwd-relative)
 *   - `node dist/bin/freeside.js` (post-build · resolves from package install)
 *
 * Resolution order: env override → package root (via import.meta.url) → cwd.
 */
function resolveConfigPath(filename: string): string {
  const envOverride = process.env.LOA_FREESIDE_CONFIG_DIR
  if (envOverride) {
    const p = join(envOverride, filename)
    if (existsSync(p)) return p
  }
  const here = dirname(fileURLToPath(import.meta.url))
  // src/zones/manifest.ts → ../../config/<file>
  // dist/bin/freeside.js  → ../../config/<file>
  const fromModule = join(here, '..', '..', 'config', filename)
  if (existsSync(fromModule)) return fromModule
  // Fallback: cwd-relative (for tests + ad-hoc runs)
  const fromCwd = join(process.cwd(), 'config', filename)
  if (existsSync(fromCwd)) return fromCwd
  throw new Error(
    `[freeside-cli] config/${filename} not found. Searched: env LOA_FREESIDE_CONFIG_DIR, ${fromModule}, ${fromCwd}`,
  )
}

function loadZones(): Zone[] {
  const path = resolveConfigPath('zones.yaml')
  const raw = readFileSync(path, 'utf-8')
  const parsed = parseYaml(raw)
  const result = zonesFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `[freeside-cli] config/zones.yaml failed Zod validation:\n${result.error.message}`,
    )
  }
  return result.data.zones
}

export const ZONES: Zone[] = loadZones()

export function findZone(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id)
}

export function zonesByStatus(status: ZoneStatus): Zone[] {
  return ZONES.filter((z) => z.status === status)
}
