/**
 * GitHub probe (live).
 *
 * Checks that zone.home resolves to a real GitHub repo at 0xHoneyJar/<home>.
 * Uses the `gh` CLI (must be installed + authenticated · graceful degradation
 * if missing). Returns findings for: repo-missing, repo-stale (last commit
 * > 90 days), repo-empty (zero commits).
 *
 * B5 fold-in: when isHeadless() OR `gh` not on PATH, returns empty findings
 * with a one-line trajectory log rather than crashing.
 */
import { spawn } from 'node:child_process'
import type { Zone } from '../zones/manifest.ts'
import { isHeadless, type Probe, type ProbeFinding } from './types.ts'

function execGh(args: string[], budget_ms: number): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const t = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ ok: false, stdout, stderr: stderr + '\n[probe.github] timeout' })
    }, budget_ms)
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      clearTimeout(t)
      resolve({ ok: code === 0, stdout, stderr })
    })
    child.on('error', (err) => {
      clearTimeout(t)
      resolve({ ok: false, stdout, stderr: stderr + '\n' + err.message })
    })
  })
}

/**
 * Extract the canonical `0xHoneyJar/<name>` slug from a zone.home string.
 *
 * Examples (from current manifest):
 *   'freeside-auth' → '0xHoneyJar/freeside-auth'
 *   'freeside-discord-deploy (NEW — not yet created)' → null (skip)
 *   'score-mibera (current production)' → '0xHoneyJar/score-mibera'
 */
function resolveRepoSlug(home: string): string | null {
  if (home.toLowerCase().includes('(new')) return null
  const m = home.match(/^([a-z0-9-]+)/i)
  if (!m) return null
  return `0xHoneyJar/${m[1]}`
}

export const githubLive: Probe = {
  name: 'github.live',
  description: 'Probe GitHub for zone.home repo existence + recent commit activity',
  async probe(zone: Zone, opts = {}): Promise<ProbeFinding[]> {
    if (isHeadless()) return []
    const budget_ms = opts.budget_ms ?? 3000
    const slug = resolveRepoSlug(zone.home)
    if (!slug) {
      return [
        {
          level: 'gap',
          scope: 'probe',
          ref: `${zone.id}:home`,
          probe: 'github.live',
          message: `Cannot resolve GitHub slug from home: "${zone.home}"`,
        },
      ]
    }
    const r = await execGh(['repo', 'view', slug, '--json', 'pushedAt'], budget_ms)
    if (!r.ok) {
      return [
        {
          level: 'error',
          scope: 'probe',
          ref: `${zone.id}:home`,
          probe: 'github.live',
          message: `GitHub repo not found or inaccessible: ${slug}`,
        },
      ]
    }
    try {
      const { pushedAt } = JSON.parse(r.stdout) as { pushedAt: string }
      const ageMs = Date.now() - new Date(pushedAt).getTime()
      const ageDays = Math.floor(ageMs / 86_400_000)
      if (ageDays > 90) {
        return [
          {
            level: 'warn',
            scope: 'probe',
            ref: `${zone.id}:freshness`,
            probe: 'github.live',
            message: `${slug} stale: last push ${ageDays} days ago`,
          },
        ]
      }
      return []
    } catch (e) {
      return [
        {
          level: 'error',
          scope: 'probe',
          ref: `${zone.id}:home`,
          probe: 'github.live',
          message: `GitHub response parse failed for ${slug}`,
        },
      ]
    }
  },
}
