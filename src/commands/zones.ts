import { Cli, z } from 'incur'
import { ZONES, findZone, type ZoneStatus } from '../zones/manifest.ts'

export const zones = Cli.create('zones', {
  description: 'Navigate Freeside zones — the typed-port contracts teams honor.',
})

zones.command('list', {
  description: 'List all zones Freeside exposes as contracts.',
  options: z.object({
    status: z
      .enum(['active', 'draft', 'aspirational', 'extracted'])
      .optional()
      .describe('Filter by lifecycle status'),
  }),
  output: z.object({
    count: z.number(),
    zones: z.array(
      z.object({
        id: z.string(),
        status: z.string(),
        description: z.string(),
        home: z.string(),
        port_count: z.number(),
        adapter_count: z.number(),
        consumer_count: z.number(),
        gap_count: z.number(),
      }),
    ),
  }),
  examples: [
    { description: 'List every zone' },
    { options: { status: 'active' }, description: 'Only active zones' },
    { options: { status: 'aspirational' }, description: 'Zones that need building' },
  ],
  run(c) {
    const filtered = c.options.status
      ? ZONES.filter((z) => z.status === (c.options.status as ZoneStatus))
      : ZONES
    return c.ok(
      {
        count: filtered.length,
        zones: filtered.map((z) => ({
          id: z.id,
          status: z.status,
          description: z.description,
          home: z.home,
          port_count: z.ports.length,
          adapter_count: z.adapters.length,
          consumer_count: z.consumers.length,
          gap_count: z.gaps?.length ?? 0,
        })),
      },
      {
        cta: {
          description: 'Next:',
          commands: [
            { command: 'zones show', args: { id: 'quests' }, description: 'Inspect a zone' },
            { command: 'doctor', description: 'Probe every zone for drift' },
          ],
        },
      },
    )
  },
})

zones.command('show', {
  description: 'Show a single zone — its port contracts, schemas, live adapters, gaps.',
  args: z.object({ id: z.string().describe('Zone id (e.g. quests, auth, discord-deploy)') }),
  examples: [
    { args: { id: 'discord-deploy' }, description: 'Inspect discord-deploy zone' },
    { args: { id: 'quests' }, description: 'Inspect quests zone' },
  ],
  run(c) {
    const z = findZone(c.args.id)
    if (!z) {
      return c.error({
        code: 'ZONE_NOT_FOUND',
        message: `No zone named "${c.args.id}". Run 'freeside zones list' to see all zones.`,
        retryable: true,
        cta: {
          description: 'List all available zones:',
          commands: [{ command: 'zones list', description: 'Show every zone' }],
        },
      })
    }
    return c.ok(z, {
      cta: {
        description: 'Next:',
        commands: [
          { command: 'doctor', options: { zone: true }, description: `Probe ${z.id} live adapters` },
          { command: 'zones list', description: 'Back to zones overview' },
        ],
      },
    })
  },
})
