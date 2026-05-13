import { Cli, z } from 'incur'
import { WORLDS, findWorld } from '../worlds/registry.ts'
import { findZone } from '../zones/manifest.ts'
import { ctaSchema } from '../lib/cta.ts'

export const worlds = Cli.create('worlds', {
  description: 'Navigate worlds — instances that honor zone contracts.',
})

const worldRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  domain: z.string().optional(),
  zones_claimed: z.array(z.string()),
  substrate: z.object({
    deploy: z.string(),
    data: z.string().optional(),
  }),
})

worlds.command('list', {
  description: 'List all known worlds and which zones they claim to honor.',
  options: z.object({
    status: z
      .enum(['live', 'staging', 'archived', 'planned'])
      .optional()
      .describe('Filter by lifecycle status'),
  }),
  output: z.object({
    count: z.number(),
    worlds: z.array(worldRowSchema),
    cta: ctaSchema,
  }),
  run(c) {
    const filtered = c.options.status
      ? WORLDS.filter((w) => w.status === c.options.status)
      : WORLDS
    const cta = {
      description: 'Next:',
      commands: [
        { command: 'worlds show', args: { id: 'purupuru' }, description: 'Inspect a world' },
        { command: 'doctor', description: "Probe every world's zones" },
      ],
    }
    return c.ok(
      {
        count: filtered.length,
        worlds: filtered.map((w) => ({
          id: w.id,
          status: w.status,
          domain: w.domain,
          zones_claimed: w.zones_claimed,
          substrate: w.substrate,
        })),
        cta,
      },
      { cta },
    )
  },
})

const zoneResolutionSchema = z.object({
  zone_id: z.string(),
  resolved: z.boolean(),
  status: z.string(),
  home: z.string().nullable(),
})

const worldDetailSchema = z.object({
  world: z.object({
    id: z.string(),
    domain: z.string().optional(),
    zones_claimed: z.array(z.string()),
    substrate: z.object({
      deploy: z.string(),
      data: z.string().optional(),
    }),
    status: z.string(),
    repo: z.string().optional(),
    notes: z.string().optional(),
  }),
  zone_resolution: z.array(zoneResolutionSchema),
  unresolved_zones: z.number(),
  drift_signal: z.string(),
  cta: ctaSchema,
})

worlds.command('show', {
  description: 'Show a single world + validate that each claimed zone resolves.',
  args: z.object({ id: z.string().describe('World id') }),
  output: worldDetailSchema,
  run(c) {
    const w = findWorld(c.args.id)
    if (!w) {
      return c.error({
        code: 'WORLD_NOT_FOUND',
        message: `No world named "${c.args.id}".`,
        retryable: true,
        cta: {
          description: 'See all worlds:',
          commands: [{ command: 'worlds list', description: 'List worlds' }],
        },
      })
    }
    const zone_resolution = w.zones_claimed.map((zid) => {
      const zone = findZone(zid)
      return {
        zone_id: zid,
        resolved: !!zone,
        status: zone?.status ?? 'unknown',
        home: zone?.home ?? null,
      }
    })
    const unresolved = zone_resolution.filter((r) => !r.resolved).length
    const cta = {
      description: 'Next:',
      commands: [
        { command: 'zones show', args: { id: w.zones_claimed[0] ?? 'auth' }, description: 'Inspect a claimed zone' },
        { command: 'worlds list', description: 'Back to worlds overview' },
      ],
    }
    return c.ok(
      {
        world: w,
        zone_resolution,
        unresolved_zones: unresolved,
        drift_signal: unresolved > 0 ? 'world claims a zone that does not exist' : 'clean',
        cta,
      },
      { cta },
    )
  },
})
