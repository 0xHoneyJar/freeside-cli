/**
 * HTTP probe (live).
 *
 * For each known live-adapter endpoint (mined from adapter.notes URLs),
 * HEAD-probe to verify the substrate is reachable. Catches dead links
 * + stale URLs in the manifest.
 *
 * B5 fold-in: headless OR DNS failure → empty findings. Per-URL timeout
 * prevents the doctor command from stalling on one dead host.
 *
 * v0.3+ enhancement: maintain per-zone explicit `endpoints[]` in manifest
 * rather than mining notes regex. Current shape is bootstrap-quality.
 */
import type { Zone } from '../zones/manifest.ts'
import { isHeadless, type Probe, type ProbeFinding } from './types.ts'

const URL_REGEX = /\bhttps?:\/\/[A-Za-z0-9.\-_/?&=:]+/g

function extractUrls(zone: Zone): string[] {
  const urls = new Set<string>()
  for (const a of zone.adapters) {
    const text = `${a.notes ?? ''} ${a.name}`
    const matches = text.match(URL_REGEX) ?? []
    for (const m of matches) {
      // strip trailing punctuation that regex sometimes captures
      urls.add(m.replace(/[.,)\]]+$/, ''))
    }
  }
  return [...urls]
}

async function headWithTimeout(url: string, budget_ms: number): Promise<Response | null> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), budget_ms)
  try {
    return await fetch(url, { method: 'HEAD', signal: ac.signal, redirect: 'manual' })
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export const httpLive: Probe = {
  name: 'http.live',
  description: 'HEAD-probe adapter endpoints mined from notes · catches stale/dead URLs',
  async probe(zone: Zone, opts = {}): Promise<ProbeFinding[]> {
    if (isHeadless()) return []
    const budget_ms = opts.budget_ms ?? 2000

    const urls = extractUrls(zone)
    if (urls.length === 0) return []

    const findings: ProbeFinding[] = []
    // Run all HEAD requests in parallel · each bounded by budget_ms
    const results = await Promise.all(
      urls.map(async (u) => ({ url: u, res: await headWithTimeout(u, budget_ms) })),
    )
    for (const { url, res } of results) {
      if (!res) {
        // DNS / timeout / network — degrade silently (likely operator-side connectivity)
        continue
      }
      // 2xx and 3xx are healthy. 4xx/5xx are gaps.
      if (res.status >= 400) {
        findings.push({
          level: 'warn',
          scope: 'probe',
          ref: `${zone.id}:endpoint:${url}`,
          probe: 'http.live',
          message: `Endpoint returned ${res.status}: ${url}`,
        })
      }
    }
    return findings
  },
}
