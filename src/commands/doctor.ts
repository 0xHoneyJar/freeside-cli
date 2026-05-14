import { Cli, z } from 'incur'
import { ZONES, findZone } from '../zones/manifest.ts'
import { WORLDS } from '../worlds/registry.ts'
import { ctaSchema } from '../lib/cta.ts'
import { probeZones, type ProbeMode } from '../probe/index.ts'

/**
 * `freeside doctor` — read-side probe across the whole ecosystem.
 *
 * v0.1 surfaced STRUCTURAL drift by emitting findings from BOTH zone.status
 * AND zone.gaps[] — redundant (same condition expressed twice).
 *
 * v0.2 single-sources gap detection (T3 · F-LOW-4):
 *   - When zone.gaps[] is non-empty → emit ONLY the gaps (gaps are canonical)
 *   - When zone.gaps[] is empty → emit status-derived fallback finding
 *
 * Consumers and cross-cut checks operate on different scope (world ↔ zone
 * resolution; cross-@0xhoneyjar/* import existence) so they emit independently.
 *
 * The diagnosis is the gap. Every red line is a real piece of work surfaced.
 */

interface Finding {
  level: 'ok' | 'warn' | 'gap' | 'error'
  scope: 'zone' | 'world' | 'cross-cut' | 'probe'
  ref: string
  message: string
}

function diagnose(zoneFilter?: string): Finding[] {
  const findings: Finding[] = []

  const zonesToCheck = zoneFilter ? [findZone(zoneFilter)].filter(Boolean) : ZONES

  for (const z of zonesToCheck) {
    if (!z) continue

    // T3 single-source applies to MESSAGE-LEVEL redundancy (zone.gaps[] entries
    // are item-level details; the original status-finding "Aspirational zone —
    // port/schema/adapter not yet extant" overlapped with gap[0] "no port file
    // extant"). Three independent signals stay independent:
    //   1. item-level: gaps[] entries (always emit)
    //   2. zone-level status warning (always emit when non-active/extracted ·
    //      summarizes that the zone-as-a-whole isn't ready)
    //   3. consumer-zero check (always emit · orthogonal · per bridgebuilder
    //      HIGH finding on PR #11)
    // The "single source" intent is: gap MESSAGES come from gaps[]; status
    // MESSAGES come from status; consumer MESSAGES come from consumer-empty
    // detection. No emission writes another's content.

    // (1) item-level gaps
    for (const gap of z.gaps ?? []) {
      findings.push({ level: 'gap', scope: 'zone', ref: z.id, message: gap })
    }

    // (2) zone-level status warning (orthogonal to gaps · summarizes zone state)
    if (z.status === 'aspirational') {
      findings.push({
        level: 'gap',
        scope: 'zone',
        ref: z.id,
        message: `Status: aspirational — zone not yet materialized. Home: ${z.home}`,
      })
    } else if (z.status === 'draft') {
      findings.push({
        level: 'warn',
        scope: 'zone',
        ref: z.id,
        message: `Status: draft — schema published but consumer story incomplete`,
      })
    }

    // (3) consumer-zero check (orthogonal · per bridgebuilder PR #11 HIGH finding)
    const verifiedConsumers = z.consumers.filter(
      (c) => c && !c.startsWith('(') && !c.includes('(deployed instance)'),
    )
    if (verifiedConsumers.length === 0) {
      findings.push({
        level: 'warn',
        scope: 'zone',
        ref: z.id,
        message: `Zero verified consumers — composition thesis unproven for this zone`,
      })
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
    probe: z
      .enum(['live', 'mock', 'off'])
      .default('off')
      .describe('Run live/mock probes against zones. Default off (manifest-only fast path).'),
  }),
  output: z.object({
    summary: z.object({
      total: z.number(),
      by_level: z.record(z.string(), z.number()),
    }),
    findings: z.array(
      z.object({
        level: z.string(),
        scope: z.enum(['zone', 'world', 'cross-cut', 'probe']),
        ref: z.string(),
        message: z.string(),
        probe: z.string().optional(),
      }),
    ),
    probe_mode: z.string(),
    cta: ctaSchema,
  }),
  examples: [
    { description: 'Full diagnostic (manifest-only)' },
    { options: { zone: 'quests' }, description: 'Just the quests zone' },
    { options: { levels: ['gap', 'error'] }, description: 'Only real problems' },
    { options: { probe: 'live' }, description: 'With live probes (github/npm/http · slower)' },
  ],
  async run(c) {
    let findings: Array<Finding & { probe?: string }> = diagnose(c.options.zone)

    // S3.T4: run probes when --probe live|mock
    const probeMode = c.options.probe as 'live' | 'mock' | 'off'
    if (probeMode !== 'off') {
      const zonesToProbe = c.options.zone
        ? ZONES.filter((z) => z.id === c.options.zone)
        : ZONES
      const probeFindings = await probeZones(zonesToProbe, probeMode as ProbeMode)
      // Per bridgebuilder PR #12 MEDIUM M-3: preserve scope: 'probe' so
      // downstream filtering (future --scope probe flag) gets correct results.
      for (const pf of probeFindings) {
        findings.push({
          level: pf.level,
          scope: pf.scope, // 'probe' · per ProbeFinding type
          ref: pf.ref,
          message: pf.message,
          probe: pf.probe,
        })
      }
    }

    if (c.options.levels?.length) {
      findings = findings.filter((f) => c.options.levels!.includes(f.level))
    }
    const by_level: Record<string, number> = {}
    for (const f of findings) {
      by_level[f.level] = (by_level[f.level] ?? 0) + 1
    }
    // F-LOW · dynamic "most-gap zone" rather than hardcoded discord-deploy
    const gapsByZone: Record<string, number> = {}
    for (const f of findings) {
      if (f.scope === 'zone') {
        gapsByZone[f.ref] = (gapsByZone[f.ref] ?? 0) + 1
      }
    }
    const mostGapZone = Object.entries(gapsByZone).sort((a, b) => b[1] - a[1])[0]?.[0]
    const cta = {
      description: 'Next:',
      commands: mostGapZone
        ? [
            {
              command: 'zones show',
              args: { id: mostGapZone },
              description: `Inspect the most-gap zone (${gapsByZone[mostGapZone]} findings)`,
            },
            { command: 'zones list', description: 'Back to overview' },
          ]
        : [{ command: 'zones list', description: 'Back to overview' }],
    }
    return c.ok(
      {
        summary: { total: findings.length, by_level },
        findings,
        probe_mode: probeMode,
        cta,
      },
      { cta },
    )
  },
})
