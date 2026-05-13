import { Cli, z } from 'incur'
import { WORLDS, findWorld } from '../worlds/registry.ts'
import { findZone } from '../zones/manifest.ts'

export const worlds = Cli.create('worlds', {
  description: 'Navigate worlds — instances that honor zone contracts.',
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
    worlds: z.array(
      z.object({
        id: z.string(),
        status: z.string(),
        domain: z.string().optional(),
        zones_claimed: z.array(z.string()),
        substrate: z.object({
          deploy: z.string(),
          data: z.string().optional(),
        }),
      }),
    ),
  }),
  run(c) {
    const filtered = c.options.status
      ? WORLDS.filter((w) => w.status === c.options.status)
      : WORLDS
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
      },
      {
        cta: {
          description: 'Next:',
          commands: [
            { command: 'worlds show', args: { id: 'purupuru' }, description: 'Inspect a world' },
            { command: 'doctor', description: 'Probe every world\'s zones' },
          ],
        },
      },
    )
  },
})

worlds.command('show', {
  description: 'Show a single world + validate that each claimed zone resolves.',
  args: z.object({ id: z.string().describe('World id') }),
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
    return c.ok({
      world: w,
      zone_resolution,
      unresolved_zones: unresolved,
      drift_signal: unresolved > 0 ? 'world claims a zone that does not exist' : 'clean',
    })
  },
})
