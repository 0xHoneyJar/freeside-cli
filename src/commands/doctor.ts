import { Cli, z } from 'incur'
import { ZONES, findZone } from '../zones/manifest.ts'
import { WORLDS } from '../worlds/registry.ts'

/**
 * `freeside doctor` — read-side probe across the whole ecosystem.
 *
 * v0.1 surfaces STRUCTURAL drift (what's declared vs what's known to exist).
 * v0.2+ extends with LIVE probes (HTTP health checks, DB connectivity, etc.)
 * via the live adapters once they're wired.
 *
 * The diagnosis is the gap. Every red line is a real piece of work surfaced.
 */

interface Finding {
  level: 'ok' | 'warn' | 'gap' | 'error'
  scope: 'zone' | 'world' | 'cross-cut'
  ref: string
  message: string
}

function diagnose(zoneFilter?: string): Finding[] {
  const findings: Finding[] = []

  const zonesToCheck = zoneFilter ? [findZone(zoneFilter)].filter(Boolean) : ZONES

  for (const z of zonesToCheck) {
    if (!z) continue
    if (z.status === 'aspirational') {
      findings.push({
        level: 'gap',
        scope: 'zone',
        ref: z.id,
        message: `Aspirational zone — port/schema/adapter not yet extant. Home: ${z.home}`,
      })
    }
    if (z.status === 'draft') {
      findings.push({
        level: 'warn',
        scope: 'zone',
        ref: z.id,
        message: `Draft zone — schema published but consumer story incomplete`,
      })
    }
    if (z.consumers.length === 0 || z.consumers[0].startsWith('(')) {
      findings.push({
        level: 'warn',
        scope: 'zone',
        ref: z.id,
        message: `Zero verified consumers — composition thesis unproven`,
      })
    }
    for (const gap of z.gaps ?? []) {
      findings.push({ level: 'gap', scope: 'zone', ref: z.id, message: gap })
    }
  }

  if (!zoneFilter) {
    for (const w of WORLDS) {
      for (const zid of w.zones_claimed) {
        const z = findZone(zid)
        if (!z) {
          findings.push({
            level: 'error',
            scope: 'world',
            ref: `${w.id} → ${zid}`,
            message: `World claims zone that does not exist in manifest`,
          })
        } else if (z.status === 'aspirational') {
          findings.push({
            level: 'warn',
            scope: 'world',
            ref: `${w.id} → ${zid}`,
            message: `World claims aspirational zone — contract not yet honorable`,
          })
        }
      }
    }

    const activeImports = ZONES.flatMap((z) =>
      z.consumers.filter((c) => !c.startsWith('(') && c !== ''),
    )
    if (activeImports.length === 0) {
      findings.push({
        level: 'gap',
        scope: 'cross-cut',
        ref: 'composition-thesis',
        message:
          'Zero verified cross-@0xhoneyjar/* imports anywhere. freeside-modules-as-installables is aspirational with zero proof points.',
      })
    }
  }

  return findings
}

export const doctor = Cli.create('doctor', {
  description: 'Probe Freeside structural health. Surfaces gaps as findings.',
})

doctor.command('check', {
  description: 'Run the full diagnostic — zones + worlds + cross-cuts.',
  options: z.object({
    zone: z.string().optional().describe('Limit to one zone'),
    levels: z
      .array(z.enum(['ok', 'warn', 'gap', 'error']))
      .optional()
      .describe('Filter by severity'),
  }),
  output: z.object({
    summary: z.object({
      total: z.number(),
      by_level: z.record(z.string(), z.number()),
    }),
    findings: z.array(
      z.object({
        level: z.string(),
        scope: z.string(),
        ref: z.string(),
        message: z.string(),
      }),
    ),
  }),
  examples: [
    { description: 'Full diagnostic' },
    { options: { zone: 'quests' }, description: 'Just the quests zone' },
    { options: { levels: ['gap', 'error'] }, description: 'Only real problems' },
  ],
  run(c) {
    let findings = diagnose(c.options.zone)
    if (c.options.levels?.length) {
      findings = findings.filter((f) => c.options.levels!.includes(f.level))
    }
    const by_level: Record<string, number> = {}
    for (const f of findings) {
      by_level[f.level] = (by_level[f.level] ?? 0) + 1
    }
    return c.ok(
      {
        summary: { total: findings.length, by_level },
        findings,
      },
      {
        cta: {
          description: 'Next:',
          commands: [
            {
              command: 'zones show',
              args: { id: 'discord-deploy' },
              description: 'Inspect the most-gap zone',
            },
            { command: 'zones list', description: 'Back to overview' },
          ],
        },
      },
    )
  },
})
