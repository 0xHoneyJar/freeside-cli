/**
 * npm probe (live).
 *
 * For each zone.adapters[i].package, query the npm registry to verify
 * the package exists + is published. Adapter packages are stable cross-repo
 * imports; this probe catches drift between manifest claims and registry truth.
 *
 * B5 fold-in: when isHeadless() OR network unreachable, returns empty.
 */
import type { Zone } from '../zones/manifest.ts'
import { isHeadless, type Probe, type ProbeFinding } from './types.ts'

async function fetchWithTimeout(url: string, budget_ms: number): Promise<Response | null> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), budget_ms)
  try {
    return await fetch(url, { signal: ac.signal })
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export const npmLive: Probe = {
  name: 'npm.live',
  description: 'Probe npm registry for zone.adapters[].package publish status',
  async probe(zone: Zone, opts = {}): Promise<ProbeFinding[]> {
    if (isHeadless()) return []
    const budget_ms = opts.budget_ms ?? 3000

    const adaptersWithPackage = zone.adapters.filter((a) => !!a.package)
    if (adaptersWithPackage.length === 0) return []

    const findings: ProbeFinding[] = []
    for (const adapter of adaptersWithPackage) {
      const pkg = adapter.package!
      // npm registry URL: encode @scope/name properly
      const encoded = pkg.replace('/', '%2F').replace('@', '%40')
      const url = `https://registry.npmjs.org/${encoded.startsWith('%40') ? encoded : pkg}`
      const r = await fetchWithTimeout(url, budget_ms)
      if (!r) {
        // network failure · degrade gracefully (don't emit · operator sees no signal)
        continue
      }
      if (!r.ok) {
        findings.push({
          level: 'gap',
          scope: 'probe',
          ref: `${zone.id}:adapter:${adapter.name}`,
          probe: 'npm.live',
          message: `Package "${pkg}" not found on npm (status ${r.status}) — adapter declares but registry has nothing`,
        })
      }
    }
    return findings
  },
}
