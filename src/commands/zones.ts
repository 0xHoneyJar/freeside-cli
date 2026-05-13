import { Cli, z } from 'incur'
import { ZONES, findZone, type ZoneStatus } from '../zones/manifest.ts'
import { ctaSchema } from '../lib/cta.ts'

export const zones = Cli.create('zones', {
  description: 'Navigate Freeside zones — the typed-port contracts teams honor.',
})

const zoneRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  description: z.string(),
  home: z.string(),
  port_count: z.number(),
  adapter_count: z.number(),
  consumer_count: z.number(),
  gap_count: z.number(),
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
    zones: z.array(zoneRowSchema),
    cta: ctaSchema,
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
    const cta = {
      description: 'Next:',
      commands: [
        { command: 'zones show', args: { id: 'quests' }, description: 'Inspect a zone' },
        { command: 'doctor', description: 'Probe every zone for drift' },
      ],
    }
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
        cta,
      },
      { cta },
    )
  },
})

const liveAdapterSchema = z.object({
  name: z.string(),
  substrate: z.string(),
  package: z.string().optional(),
  notes: z.string().optional(),
})

const zoneDetailSchema = z.object({
  id: z.string(),
  description: z.string(),
  ports: z.array(z.string()),
  schemas: z.array(z.string()),
  home: z.string(),
  adapters: z.array(liveAdapterSchema),
  status: z.string(),
  consumers: z.array(z.string()),
  tiering: z
    .object({
      free: z.string(),
      managed: z.string().optional(),
    })
    .optional(),
  gaps: z.array(z.string()).optional(),
  cta: ctaSchema,
})

zones.command('show', {
  description: 'Show a single zone — its port contracts, schemas, live adapters, gaps.',
  args: z.object({ id: z.string().describe('Zone id (e.g. quests, auth, discord-deploy)') }),
  output: zoneDetailSchema,
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
    const cta = {
      description: 'Next:',
      commands: [
        { command: 'doctor', options: { zone: z.id }, description: `Probe ${z.id} live adapters` },
        { command: 'zones list', description: 'Back to zones overview' },
      ],
    }
    // Explicit field pick · consistent with worlds.show pattern · per
    // bridgebuilder PR #11 LOW finding (no field-passthrough risk if Zone
    // gains new fields not in zoneDetailSchema)
    return c.ok(
      {
        id: z.id,
        description: z.description,
        ports: z.ports,
        schemas: z.schemas,
        home: z.home,
        adapters: z.adapters,
        status: z.status,
        consumers: z.consumers,
        tiering: z.tiering,
        gaps: z.gaps,
        cta,
      },
      { cta },
    )
  },
})
