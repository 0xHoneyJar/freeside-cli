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
      // Strip sub-export path (npm registry has no concept of deep imports)
      // and encode the package name correctly. Per bridgebuilder PR #12 HIGH H-1.
      // Examples:
      //   @0xhoneyjar/freeside-auth/adapters/keychain → @0xhoneyjar/freeside-auth
      //   @0xhoneyjar/freeside-score                 → @0xhoneyjar/freeside-score
      //   express                                     → express
      const parts = pkg.split('/')
      const pkgName = pkg.startsWith('@') && parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : (parts[0] ?? pkg)
      const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`
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
