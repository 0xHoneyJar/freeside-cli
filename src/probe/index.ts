/**
 * Probe composer — runs all probes against a zone (or all zones) and
 * aggregates findings.
 *
 * S3.T4: `freeside doctor check --probe <live|mock>` consumes this.
 * Default mode (no --probe flag) skips probes entirely (manifest-only
 * structural diagnostic per S2.T3 three-signal model).
 */
import type { Zone } from '../zones/manifest.ts'
import { githubLive } from './github.live.ts'
import { npmLive } from './npm.live.ts'
import { httpLive } from './http.live.ts'
import { mockProbes } from './mocks/index.ts'
import type { Probe, ProbeFinding, ProbeMode } from './types.ts'

export type { Probe, ProbeFinding, ProbeMode } from './types.ts'
export { isHeadless } from './types.ts'

export const liveProbes: Probe[] = [githubLive, npmLive, httpLive]

export function selectProbes(mode: ProbeMode): Probe[] {
  return mode === 'mock' ? mockProbes : liveProbes
}

/**
 * Probe one zone with all selected probes. Returns aggregated findings.
 * Each probe is bounded by budget_ms · all run in parallel.
 */
export async function probeZone(
  zone: Zone,
  mode: ProbeMode,
  opts: { budget_ms?: number } = {},
): Promise<ProbeFinding[]> {
  const probes = selectProbes(mode)
  const results = await Promise.all(probes.map((p) => p.probe(zone, opts)))
  return results.flat()
}

/**
 * Probe multiple zones in parallel. Returns flat aggregated findings.
 */
export async function probeZones(
  zones: Zone[],
  mode: ProbeMode,
  opts: { budget_ms?: number } = {},
): Promise<ProbeFinding[]> {
  const results = await Promise.all(zones.map((z) => probeZone(z, mode, opts)))
  return results.flat()
}
