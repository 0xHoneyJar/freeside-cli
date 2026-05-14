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
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { resolveConfigPath } from '../lib/config-path.ts'

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

function loadZones(): Zone[] {
  const path = resolveConfigPath('zones.yaml', import.meta.url)
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
