# @0xhoneyjar/freeside-cli

> Sovereign CLI for navigating Freeside zones, worlds, and deployments. The CLI is sovereign · the construct is the lens · they compose.

```sh
bun add -g @0xhoneyjar/freeside-cli
# or
npm i -g @0xhoneyjar/freeside-cli

freeside --help
```

## The doctrine

**Zones = typed-port contracts Freeside exposes as hexagonal seams.** Teams deploying on Freeside pick the zones they need and *honor* the port + schema. Substrate (Vercel, Railway, AWS, Cloudflare) lives in the live adapter, not the zone itself. Sovereign infrastructure is an **option**, not a requirement.

This CLI is the deterministic substrate. `construct-freeside` is the LLM lens that knows when/why to invoke CLI verbs. Both run in CI, in scripts, in 3am incidents — and from inside an agent session.

Built on [`incur`](https://github.com/) — every command is agent-discoverable via `--llms`, `--mcp`, and auto-generated skill files.

## The 8 zones (v0.1)

```sh
freeside zones list
```

| zone | status | home | first consumer |
|---|---|---|---|
| `discord-deploy` | aspirational | NEW repo needed | none yet |
| `quests` | extracted | freeside-quests | cubquests (reverse-extraction pending) |
| `auth` | active | freeside-auth | freeside-cli (this!) |
| `score` | active | score-mibera | mibera-dimensions |
| `storage` | active | freeside-storage | freeside-characters |
| `worlds` | draft | freeside-worlds | none yet |
| `characters` | active | freeside-characters | (self) |
| `mediums` | active | freeside-mediums | freeside-characters |

```sh
freeside zones show discord-deploy   # inspect one zone's port + schema + gaps
freeside doctor check                # surface gaps as findings
```

## The 5 worlds (v0.1)

```sh
freeside worlds list
freeside worlds show purupuru
```

Worlds declare which zones they claim to honor. `worlds show` cross-references the zones manifest and surfaces drift.

## Outputs

Every command emits structured envelopes. Default is **TOON** (token-efficient). Override:

```sh
freeside zones list --json          # JSON.parse-safe
freeside zones list --format yaml   # human readable
freeside zones list --format md     # GitHub-flavored markdown
```

CTAs guide agents on next commands. Error envelopes include `code`, `retryable`, and `cta.commands` for self-correction.

## Agent discovery

```sh
freeside --llms              # markdown skill manifest
freeside --llms --format json # JSON schema manifest
freeside --mcp               # start as MCP stdio server
freeside mcp add             # register CLI as MCP server with Claude Code / Cursor / Amp
freeside skills add          # install agent skill files
```

## The composition thesis (currently aspirational)

Zero cross-`@0xhoneyjar/*` imports exist anywhere in the freeside-* ecosystem as of 2026-05-12. `freeside-cli` is positioned to ship the first such imports (consuming `@0xhoneyjar/freeside-auth` for OS-keychain integration in v0.2). The four-folder pattern (`domain/ports/live/mock`) from [`construct-honeycomb-substrate`](https://github.com/0xHoneyJar/construct-honeycomb-substrate) is the structural target.

The reverse-extraction test (PRD lane B1 · 2026-05-12) is the falsification gate — cubquests consuming its own extracted quests-engine validates the thesis or surfaces coupling debt.

## Status

`v0.1.0-alpha.0` — read-side only. Write-side verbs (`deploy`, `install`, `auth login`, `score query`) ship in v0.2+ as live adapters are wired.

## License

MIT · © 2026 0xHoneyJar
