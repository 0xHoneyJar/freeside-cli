/**
 * Worlds registry.
 *
 * S3.T2 (Substrate Liberation): canonical data ships at `config/worlds.yaml`.
 * This module defines the Zod worldSchema, loads the yaml at startup, and
 * exports the validated array.
 *
 * In v1.0 the registry zone (freeside-worlds) becomes the live adapter
 * for this data. For v0.2 it's local yaml · same shape as v1.0 will use.
 *
 * Each world declares which zones it claims to honor. `freeside doctor`
 * cross-references this with the zones manifest to surface drift.
 *
 * Canonical schema lives here; commands import worldSchema for output:
 * declarations.
 */
import { z } from 'incur'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse as parseYaml } from 'yaml'

export const worldSchema = z.object({
  id: z.string(),
  domain: z.string().optional(),
  zones_claimed: z.array(z.string()),
  substrate: z.object({
    deploy: z.enum(['vercel', 'railway', 'self-hosted']),
    data: z.enum(['railway-postgres', 'supabase', 'convex', 'self-hosted', 'none']).optional(),
  }),
  status: z.enum(['live', 'staging', 'archived', 'planned']),
  repo: z.string().optional(),
  notes: z.string().optional(),
})

export type World = z.infer<typeof worldSchema>

const worldsFileSchema = z.object({
  worlds: z.array(worldSchema),
})

function resolveConfigPath(filename: string): string {
  const envOverride = process.env.LOA_FREESIDE_CONFIG_DIR
  if (envOverride) {
    const p = join(envOverride, filename)
    if (existsSync(p)) return p
  }
  const here = dirname(fileURLToPath(import.meta.url))
  const fromModule = join(here, '..', '..', 'config', filename)
  if (existsSync(fromModule)) return fromModule
  const fromCwd = join(process.cwd(), 'config', filename)
  if (existsSync(fromCwd)) return fromCwd
  throw new Error(
    `[freeside-cli] config/${filename} not found. Searched: env LOA_FREESIDE_CONFIG_DIR, ${fromModule}, ${fromCwd}`,
  )
}

function loadWorlds(): World[] {
  const path = resolveConfigPath('worlds.yaml')
  const raw = readFileSync(path, 'utf-8')
  const parsed = parseYaml(raw)
  const result = worldsFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `[freeside-cli] config/worlds.yaml failed Zod validation:\n${result.error.message}`,
    )
  }
  return result.data.worlds
}

export const WORLDS: World[] = loadWorlds()

export function findWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id)
}
