/**
 * E2E test surface for freeside-cli.
 *
 * Runs the cli with custom argv + stdout capture (incur's serve() supports
 * dependency injection for testability — no subprocess required).
 */
import { describe, test, expect } from 'bun:test'
import cli from '../src/cli.ts'

interface CapturedRun {
  stdout: string
  exitCode: number
}

async function run(argv: string[]): Promise<CapturedRun> {
  let stdout = ''
  let exitCode = 0
  await cli.serve(argv, {
    stdout(s) {
      stdout += s
    },
    exit(code) {
      exitCode = code
    },
    env: { ...process.env, NO_COLOR: '1', FORCE_TTY: '0' },
  })
  return { stdout, exitCode }
}

function parseJson(stdout: string): any {
  return JSON.parse(stdout)
}

describe('freeside --help / --version / --llms', () => {
  test('--version returns semver-shaped string', async () => {
    const r = await run(['--version'])
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/)
    expect(r.exitCode).toBe(0)
  })

  test('--help lists every command group', async () => {
    const r = await run(['--help'])
    expect(r.stdout).toContain('zones')
    expect(r.stdout).toContain('worlds')
    expect(r.stdout).toContain('doctor')
    expect(r.stdout).toContain('status')
    expect(r.exitCode).toBe(0)
  })

  test('--llms --format json returns incur.v1 manifest', async () => {
    const r = await run(['--llms', '--format', 'json'])
    const m = parseJson(r.stdout)
    expect(m.version).toBe('incur.v1')
    const names = m.commands.map((c: any) => c.name)
    expect(names).toContain('zones list')
    expect(names).toContain('zones show')
    expect(names).toContain('worlds list')
    expect(names).toContain('worlds show')
    expect(names).toContain('doctor check')
    expect(names).toContain('status summary')
  })
})

describe('zones list / show', () => {
  test('zones list --json returns 8 zones', async () => {
    const r = await run(['zones', 'list', '--json'])
    const data = parseJson(r.stdout)
    expect(data.count).toBe(8)
    const ids = data.zones.map((z: any) => z.id)
    expect(ids).toEqual([
      'discord-deploy',
      'quests',
      'auth',
      'score',
      'storage',
      'worlds',
      'characters',
      'mediums',
    ])
  })

  test('zones list --status active --json returns active zones only', async () => {
    const r = await run(['zones', 'list', '--status', 'active', '--json'])
    const data = parseJson(r.stdout)
    expect(data.zones.every((z: any) => z.status === 'active')).toBe(true)
  })

  test('zones list --status invalid returns VALIDATION_ERROR', async () => {
    const r = await run(['zones', 'list', '--status', 'invalid', '--json'])
    const env = parseJson(r.stdout)
    expect(env.code).toBe('VALIDATION_ERROR')
    expect(r.exitCode).not.toBe(0)
  })

  test('zones show <existing> --json returns full zone', async () => {
    const r = await run(['zones', 'show', 'quests', '--json'])
    const data = parseJson(r.stdout)
    expect(data.id).toBe('quests')
    expect(data.ports).toContain('IQuestEngine')
    expect(data.adapters.length).toBeGreaterThan(0)
    expect(Array.isArray(data.gaps)).toBe(true)
  })

  test('zones show <nonexistent> --json returns ZONE_NOT_FOUND with CTA', async () => {
    const r = await run(['zones', 'show', 'no-such-zone', '--json'])
    const env = parseJson(r.stdout)
    expect(env.code).toBe('ZONE_NOT_FOUND')
    expect(env.retryable).toBe(true)
    expect(env.cta.commands[0].command).toBe('freeside zones list')
    expect(r.exitCode).not.toBe(0)
  })

  test('every zone declares required shape', async () => {
    const r = await run(['zones', 'list', '--json'])
    const data = parseJson(r.stdout)
    for (const z of data.zones) {
      expect(z.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(['active', 'draft', 'aspirational', 'extracted']).toContain(z.status)
      expect(z.home).toBeTruthy()
      expect(z.port_count).toBeGreaterThan(0)
    }
  })
})

describe('worlds list / show', () => {
  test('worlds list --json returns 5 worlds, all live', async () => {
    const r = await run(['worlds', 'list', '--json'])
    const data = parseJson(r.stdout)
    expect(data.count).toBe(5)
    expect(data.worlds.every((w: any) => w.status === 'live')).toBe(true)
  })

  test('worlds show <existing> resolves all claimed zones', async () => {
    const r = await run(['worlds', 'show', 'purupuru', '--json'])
    const data = parseJson(r.stdout)
    expect(data.world.id).toBe('purupuru')
    expect(data.drift_signal).toBe('clean')
    expect(data.unresolved_zones).toBe(0)
    expect(data.zone_resolution.every((zr: any) => zr.resolved)).toBe(true)
  })

  test('worlds show <nonexistent> returns WORLD_NOT_FOUND', async () => {
    const r = await run(['worlds', 'show', 'no-such-world', '--json'])
    const env = parseJson(r.stdout)
    expect(env.code).toBe('WORLD_NOT_FOUND')
  })
})

describe('doctor check', () => {
  test('full check surfaces ≥20 findings', async () => {
    const r = await run(['doctor', 'check', '--json'])
    const data = parseJson(r.stdout)
    expect(data.summary.total).toBeGreaterThanOrEqual(20)
    expect(data.findings.length).toBe(data.summary.total)
  })

  test('--zone limits to single zone findings', async () => {
    const r = await run(['doctor', 'check', '--zone', 'quests', '--json'])
    const data = parseJson(r.stdout)
    const refs = new Set(data.findings.map((f: any) => f.ref))
    expect(refs.size).toBe(1)
    expect(refs.has('quests')).toBe(true)
  })

  test('--levels filters by severity', async () => {
    const r = await run(['doctor', 'check', '--levels', 'gap', '--json'])
    const data = parseJson(r.stdout)
    expect(data.findings.every((f: any) => f.level === 'gap')).toBe(true)
  })
})

describe('status summary', () => {
  test('returns version + zone counts + world counts + doctrine', async () => {
    const r = await run(['status', 'summary', '--json'])
    const data = parseJson(r.stdout)
    expect(data.cli_version).toMatch(/^\d+\.\d+\.\d+/)
    expect(data.zones.total).toBe(8)
    expect(data.worlds.total).toBe(5)
    expect(data.doctrine.composition_thesis).toBeTruthy()
  })
})

describe('error surface', () => {
  test('unknown root command returns COMMAND_NOT_FOUND', async () => {
    const r = await run(['lolcat', '--json'])
    const env = parseJson(r.stdout)
    expect(env.code).toBe('COMMAND_NOT_FOUND')
  })

  test('unknown sub command returns COMMAND_NOT_FOUND with group help CTA', async () => {
    const r = await run(['zones', 'lolcat', '--json'])
    const env = parseJson(r.stdout)
    expect(env.code).toBe('COMMAND_NOT_FOUND')
    expect(env.cta.commands[0].command).toContain('zones')
  })
})

describe('integrity: worlds claim only existing zones', () => {
  test('every world.zones_claimed entry resolves in the zones manifest', async () => {
    const r = await run(['worlds', 'list', '--json'])
    const worlds = parseJson(r.stdout).worlds
    const zr = await run(['zones', 'list', '--json'])
    const zoneIds = new Set(parseJson(zr.stdout).zones.map((z: any) => z.id))
    for (const w of worlds) {
      for (const claimed of w.zones_claimed) {
        expect(zoneIds.has(claimed)).toBe(true)
      }
    }
  })
})
