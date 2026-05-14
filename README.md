# @0xhoneyjar/freeside-cli

> Freeside operations CLI for agents and humans.

```sh
bun add -g @0xhoneyjar/freeside-cli
# or
npm i -g @0xhoneyjar/freeside-cli

freeside --help
```

## The doctrine

**Zones = typed-port contracts Freeside exposes as hexagonal seams.** Teams deploying on Freeside pick the zones they need and *honor* the port + schema. Substrate (Vercel, Railway, AWS, Cloudflare) lives in the live adapter, not the zone itself. Sovereign infrastructure is an **option**, not a requirement.

This CLI is the deterministic substrate. `construct-freeside` is the LLM lens that knows when/why to invoke CLI verbs. Both run in CI, in scripts, in 3am incidents — and from inside an agent session.

Built on [`incur`](https://www.npmjs.com/package/incur) — every command is agent-discoverable via `--llms`, `--mcp`, and auto-generated skill files.

## Zones

```sh
freeside zones list
```

| zone | status | home | notes |
|---|---|---|---|
| `discord-deploy` | aspirational | NEW repo needed | operator-named priority for next cycle |
| `quests` | extracted | `freeside-quests` | `@0xhoneyjar/quests-engine` on npm · reverse-extraction test pending |
| `identity` | active | `freeside-auth` | three-layer spine (credential / identity / session) |
| `score` | active | `freeside-score` | tiering exemplar · operator-named |
| `storage` | active | `freeside-storage` | R2-mirroring · variant pipeline |
| `sonar` | active | `freeside-sonar` | onchain indexer · 6 chains · HyperIndex V3 |
| `worlds` | draft | `freeside-worlds` | the registry zone itself |
| `characters` | active | `freeside-characters` | character voice + persona |
| `mediums` | active | `freeside-mediums` | medium registry + capability routing |

```sh
freeside zones show identity         # inspect one zone's port + schema + gaps
freeside doctor check                # surface gaps as findings
freeside doctor check --probe live   # probe github + npm + http for real drift
```

## Worlds

```sh
freeside worlds list
freeside worlds show purupuru
```

Worlds declare which zones they claim to honor. `worlds show` cross-references the zones manifest and surfaces drift.

## Three-layer identity verbs

```sh
freeside credential add <account> --token <jwt> --backend <auto|memory|file|os>
freeside credential list
freeside credential test <account>

freeside identity show <user_id>     # scaffold · v0.3 wires spine
freeside identity link <credential>
freeside identity whoami

freeside session validate <jwt>      # scaffold · v0.3 wires JWKS verification
freeside session verify-jwks <issuer>
```

Per [`freeside-as-identity-spine`](https://github.com/0xHoneyJar/loa-hivemind) doctrine: **credential** (adapters · wallet/passkey/oauth/otp) · **identity** (canonical THJ user_id + JWT issuance) · **session** (per-world JWT verification via JWKS). Three orthogonal layers · verb expressivity teaches the boundary.

Keychain backends (FR-KEY-5 graceful degradation):
- **memory** — in-process · TTL · process-singleton
- **file** — `~/.freeside/credentials.enc` · AES-256-GCM · `FREESIDE_CRED_KEY` env required
- **os** — stub in v0.2 · v0.3 wires `@0xhoneyjar/freeside-auth-adapters/keychain` once companion publishes

## Outputs

Every command emits structured envelopes. Default is **TOON** (token-efficient). Override:

```sh
freeside zones list --json          # JSON.parse-safe
freeside zones list --format yaml
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

All 14 tools expose typed `outputSchema` (including CTAs as structured fields) so agents reading via MCP see typed next-action hints, not just opaque text.

## Configuration

Zones + worlds ship in `config/zones.yaml` + `config/worlds.yaml` (operator-editable · Zod-validated at load). Override location via `LOA_FREESIDE_CONFIG_DIR` env. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to add a zone.

## Status

`v0.2.0` — foundation. Read-side verbs functional · three-layer identity scaffold (credential layer wired · identity/session pending v0.3 spine binding) · `doctor --probe live` runs real github/npm/http probes with B5 graceful degradation in CI/headless.

Write-side verbs (`deploy`, `install`) ship in v0.3+ as zone live-adapter packages publish.

## License

MIT · © 2026 0xHoneyJar
