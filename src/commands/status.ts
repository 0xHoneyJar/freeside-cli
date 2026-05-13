import { Cli, z } from 'incur'
import { VERSION } from '../version.ts'
import { ZONES, zonesByStatus } from '../zones/manifest.ts'
import { WORLDS } from '../worlds/registry.ts'

export const status = Cli.create('status', {
  description: 'Snapshot of freeside-cli + ecosystem state.',
})

status.command('summary', {
  description: 'High-level shape: zones counted by status, worlds counted by status.',
  output: z.object({
    cli_version: z.string(),
    zones: z.object({
      total: z.number(),
      active: z.number(),
      draft: z.number(),
      aspirational: z.number(),
      extracted: z.number(),
    }),
    worlds: z.object({
      total: z.number(),
      live: z.number(),
      staging: z.number(),
      planned: z.number(),
      archived: z.number(),
    }),
    doctrine: z.object({
      composition_thesis: z.string(),
      first_proof_point_pending: z.string(),
    }),
  }),
  run(c) {
    return c.ok(
      {
        cli_version: VERSION,
        zones: {
          total: ZONES.length,
          active: zonesByStatus('active').length,
          draft: zonesByStatus('draft').length,
          aspirational: zonesByStatus('aspirational').length,
          extracted: zonesByStatus('extracted').length,
        },
        worlds: {
          total: WORLDS.length,
          live: WORLDS.filter((w) => w.status === 'live').length,
          staging: WORLDS.filter((w) => w.status === 'staging').length,
          planned: WORLDS.filter((w) => w.status === 'planned').length,
          archived: WORLDS.filter((w) => w.status === 'archived').length,
        },
        doctrine: {
          composition_thesis: 'freeside-modules-as-installables (aspirational · candidate)',
          first_proof_point_pending:
            'freeside-cli itself is the candidate · first cross-@0xhoneyjar/* import lands here',
        },
      },
      {
        cta: {
          description: 'Next:',
          commands: [
            { command: 'zones list', description: 'See all zone contracts' },
            { command: 'doctor check', description: 'Surface gaps' },
            { command: 'worlds list', description: 'See claimants' },
          ],
        },
      },
    )
  },
})
