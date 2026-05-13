/**
 * Probe port — honeycomb hexagonal pattern.
 *
 * Each probe answers ONE question about a zone's real-world state:
 *   - github.live: does zone.home repo exist on GitHub? last commit?
 *   - npm.live: are zone.adapters[*].package entries published to npm?
 *   - http.live: do adapter endpoints respond?
 *
 * S3.T3+T4 (Substrate Liberation): replaces the tautological diagnose()
 * which only reads manifest-declared state. Probes ground manifest
 * claims against external truth.
 *
 * B5 fold-in: probes MUST gracefully degrade in headless/CI envs.
 * Detection via process.env.CI / GITHUB_ACTIONS / LOA_HEADLESS.
 */
import type { Zone } from '../zones/manifest.ts'

export type ProbeMode = 'live' | 'mock'

export interface ProbeFinding {
  level: 'ok' | 'warn' | 'gap' | 'error'
  scope: 'probe'
  ref: string // typically zone.id + ':' + probe-specific suffix
  probe: string // e.g. 'github.live'
  message: string
}

export interface Probe {
  /** Stable name for trajectory + audit. e.g. 'github.live' */
  name: string
  /** Human-readable description of what this probe checks. */
  description: string
  /**
   * Run the probe against a zone. MUST resolve in <budget_ms or timeout.
   * MUST NOT throw — returns empty array on degraded/disabled state.
   */
  probe(zone: Zone, opts: { budget_ms?: number }): Promise<ProbeFinding[]>
}

/**
 * Detect headless / CI environments. B5 fold-in: probes degrade
 * gracefully rather than crash when interactive auth is unavailable.
 */
export function isHeadless(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.CI === 'true' ||
    env.GITHUB_ACTIONS === 'true' ||
    env.LOA_HEADLESS === '1' ||
    !!env.LOA_PROBE_MODE_MOCK
  )
}
