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
  test('zones list --json returns 9 zones', async () => {
    const r = await run(['zones', 'list', '--json'])
    const data = parseJson(r.stdout)
    expect(data.count).toBe(9)
    const ids = data.zones.map((z: any) => z.id)
    expect(ids).toEqual([
      'discord-deploy',
      'quests',
      'auth',
      'score',
      'storage',
      'sonar',
      'worlds',
      'characters',
      'mediums',
    ])
  })

  test('score zone home is freeside-score (not score-mibera)', async () => {
    const r = await run(['zones', 'show', 'score', '--json'])
    const z = parseJson(r.stdout)
    expect(z.home).toBe('freeside-score')
    expect(z.ports).toContain('IScoreServiceClient')
  })

  test('every zone home is a freeside-* repo (subway doctrine)', async () => {
    const r = await run(['zones', 'list', '--json'])
    const zones = parseJson(r.stdout).zones
    for (const z of zones) {
      expect(z.home).toMatch(/^freeside-/)
    }
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
    expect(data.zones.total).toBe(9)
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

describe('Sprint 2 · agent surface', () => {
  describe('T1+T2 · CTAs survive in typed output (MCP path)', () => {
    test('zones list output has typed cta in data', async () => {
      const r = await run(['zones', 'list', '--json'])
      const data = parseJson(r.stdout)
      expect(data.cta).toBeDefined()
      expect(typeof data.cta.description).toBe('string')
      expect(Array.isArray(data.cta.commands)).toBe(true)
      expect(data.cta.commands.length).toBeGreaterThan(0)
      expect(data.cta.commands[0].command).toBeDefined()
    })

    test('zones show output has typed Zone shape + cta', async () => {
      const r = await run(['zones', 'show', 'auth', '--json'])
      const data = parseJson(r.stdout)
      // typed Zone shape (T1)
      expect(data.id).toBe('auth')
      expect(Array.isArray(data.ports)).toBe(true)
      expect(Array.isArray(data.adapters)).toBe(true)
      expect(Array.isArray(data.consumers)).toBe(true)
      // typed cta (T2)
      expect(data.cta).toBeDefined()
      expect(Array.isArray(data.cta.commands)).toBe(true)
    })

    test('worlds list output has typed cta in data', async () => {
      const r = await run(['worlds', 'list', '--json'])
      const data = parseJson(r.stdout)
      expect(data.cta).toBeDefined()
      expect(data.cta.commands.length).toBeGreaterThan(0)
    })

    test('worlds show output has typed shape + cta', async () => {
      const r = await run(['worlds', 'show', 'purupuru', '--json'])
      const data = parseJson(r.stdout)
      // typed World+resolution shape (T1)
      expect(data.world).toBeDefined()
      expect(data.world.id).toBe('purupuru')
      expect(Array.isArray(data.zone_resolution)).toBe(true)
      expect(typeof data.unresolved_zones).toBe('number')
      expect(typeof data.drift_signal).toBe('string')
      // typed cta (T2)
      expect(data.cta).toBeDefined()
      expect(Array.isArray(data.cta.commands)).toBe(true)
    })

    test('doctor check output has typed cta', async () => {
      const r = await run(['doctor', 'check', '--json'])
      const data = parseJson(r.stdout)
      expect(data.cta).toBeDefined()
      expect(data.cta.description).toBeDefined()
    })

    test('status summary output has typed cta', async () => {
      const r = await run(['status', 'summary', '--json'])
      const data = parseJson(r.stdout)
      expect(data.cta).toBeDefined()
      expect(data.cta.commands.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('T3 · three independent signals (post bridgebuilder PR #11 HIGH fix)', () => {
    test('aspirational zone with gaps[] emits gap entries + status + consumer-zero', async () => {
      // discord-deploy: status=aspirational · 4 gaps · 0 consumers.
      // Per bridgebuilder PR #11 HIGH: three signals stay independent.
      const r = await run(['doctor', 'check', '--zone', 'discord-deploy', '--json'])
      const data = parseJson(r.stdout)
      const messages = data.findings.map((f: any) => f.message)
      // (1) item-level gaps[] entries
      expect(messages.some((m: string) => m.includes('no port file extant'))).toBe(true)
      expect(messages.some((m: string) => m.includes('verification flow shape unclear'))).toBe(true)
      // (2) zone-level status signal (renamed · semantically distinct from gaps)
      expect(messages.some((m: string) => m.startsWith('Status: aspirational'))).toBe(true)
      // (3) consumer-zero signal (restored per HIGH finding)
      expect(messages.some((m: string) => m.includes('Zero verified consumers'))).toBe(true)
    })

    test('draft-status warning fires alongside gaps (distinct semantics)', async () => {
      // worlds zone is draft with gaps. Per bridgebuilder PR #11 MEDIUM:
      // draft warning is a different semantic class from individual gaps.
      const r = await run(['doctor', 'check', '--zone', 'worlds', '--json'])
      const data = parseJson(r.stdout)
      const messages = data.findings.map((f: any) => f.message)
      expect(messages.some((m: string) => m.startsWith('Status: draft'))).toBe(true)
    })

    test('consumer-zero check fires for zones lacking verified consumers', async () => {
      // discord-deploy + worlds both have effectively zero verified consumers.
      const r = await run(['doctor', 'check', '--json'])
      const data = parseJson(r.stdout)
      const zerocons = data.findings.filter((f: any) =>
        f.message.includes('Zero verified consumers'),
      )
      expect(zerocons.length).toBeGreaterThan(0)
    })

    test('active zones with verified consumers do NOT emit consumer-zero', async () => {
      // characters has freeside-characters consumer. storage has freeside-characters + mibera-dimensions.
      const r = await run(['doctor', 'check', '--zone', 'storage', '--json'])
      const data = parseJson(r.stdout)
      const messages = data.findings.map((f: any) => f.message)
      expect(messages.some((m: string) => m.includes('Zero verified consumers'))).toBe(false)
    })
  })
})
