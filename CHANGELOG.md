# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-05-13 — Foundation Release · Doctrine Made Active cycle

First proper release. Four sprints shipped end-to-end (S1 ship foundation · S2 agent surface · S3 substrate liberation · S4 Group A composition proof). Each landed via implement → bridgebuilder review → fix-pass → CI green → squash-merge.

### Added (cumulative across S1-S4 Group A)

**S4 Group A — composition proof (cli surface)**
- Three-layer verb taxonomy per identity-spine doctrine:
  - `freeside credential add|list|test` — credential layer (functional · keychain backend)
  - `freeside identity show|link|whoami` — spine layer (scaffold · v0.3 wires spine)
  - `freeside session validate|verify-jwks` — session layer (scaffold · v0.3 wires JWKS)
- Keychain adapter w/ FR-KEY-5 graceful degradation: memory + file (AES-256-GCM · salt-in-ciphertext) + os stub
- MCP `tools/list` surfaces 14 typed tools (was 6 · +8 from three-layer verbs)
- Identity zone rename (was `auth`) · three-layer ports declared

**S3 — substrate liberation**
- `config/zones.yaml` + `config/worlds.yaml` (operator-editable · Zod-validated at load)
- `src/probe/` honeycomb four-folder pattern (`types.ts` + `github.live.ts` + `npm.live.ts` + `http.live.ts` + `mocks/` + `index.ts`)
- `freeside doctor check --probe <live|mock|off>` flag · default off (zero perf)
- `isHeadless()` detection · B5 graceful degradation in CI/headless envs
- `config/` ships in npm tarball

**S2 — agent surface**
- Shared `ctaSchema` in `src/lib/cta.ts` · CTAs embedded in typed `output:` schemas
- MCP `structuredContent` includes CTAs (was stripped pre-S2)
- All 6 read-side commands have full `outputSchema` for MCP discoverability
- Three independent doctor signals (item-level gaps · zone-level status · cross-cut consumer-zero)
- `src/version.ts` single-source version (imports `package.json`)

**S1 — ship foundation**
- `tsup` build pipeline → `dist/bin/freeside.js` (npm-installable under node)
- `prepublishOnly` script
- LICENSE · CHANGELOG · SECURITY · CONTRIBUTING
- CI workflow with bun cache
- `incur@0.4.5` pinned exact

### Changed

- Package description: short-form "Freeside operations CLI for agents and humans" (was long doctrinal sentence)
- Zone naming: `auth` → `identity` (matches `freeside-as-identity-spine` doctrine)
- Score zone home: `score-mibera` → `freeside-score` (subway doctrine · operator correction)
- Doctor's gap-detection: three independent signals (was redundant single-pipeline)
- README + CONTRIBUTING incur links: github root → npmjs canonical

### Fixed

- F-CRIT-1: bin runtime broken under node (shebang on `.ts` source) → tsup-built dist
- F-HIGH-1: `_show` commands missing MCP `outputSchema`
- F-HIGH-2: CTAs stripped on MCP path (now embedded in typed output schemas)
- npm URL encoding for scoped packages with sub-export paths (`@scope/pkg/sub` correctly resolves to scope+pkg)
- File backend salt-in-ciphertext (was version-string baked · would lose credentials on version bump)
- Atomic write-then-rename pattern on `credentials.enc` (concurrent-write safety)

### Doctrine candidates

Coined / sharpened across the cycle:
- `zones-as-hexagonal-seam` (operator-coined 2026-05-13)
- `cli-as-substrate-construct-as-lens` (gecko 2026-05-12 · validated via 4-sprint ship)
- Subway-doctrine alignment ratified (every `freeside-*` IS the zone home · operator-confirmed)

### Filed upstream

- `wevm/incur#140` — feature request: `_meta.cta` first-class MCP support (path B for F-HIGH-2 · current solution embeds in output schemas)
- `0xHoneyJar/loa#878` — flatline-orchestrator mktemp/chmod cosmetic
- `0xHoneyJar/loa#880` — claude-headless subscription routing structural defect

### Cycle artifacts

- PRD: `bonfire/grimoires/loa/prd.md` (Doctrine Made Active)
- SDD: `bonfire/grimoires/loa/sdd.md`
- Sprint plan: `bonfire/grimoires/loa/sprint.md`
- 4 PRs merged: #10 (S1) · #11 (S2) · #12 (S3) · #13 (S4 Group A)

### Deferred to v0.3+

- Cross-`@0xhoneyjar/*` import (freeside-cli → freeside-auth-adapters/keychain) — companion `freeside-auth#3` operator-paced
- Reverse-extraction test (cubquests → quests-engine) — lane B1 falsification gate
- Immune-system construct (S4 Group B) · GH Action packaging (Group C) · backtest cohort (Group D) — multi-day operator-decision work
- Write-side verbs (`deploy`, `install`) — gate on zone live adapters publishing

## [0.2.0-alpha.0] — 2026-05-13 — Ship Foundation (Sprint 1)

### Added
- `tsup` build pipeline producing `dist/bin/freeside.js` for npm install -g (closes #1 F-CRIT-1)
- `prepublishOnly` script — runs tests + build before publish
- `LICENSE` (MIT, © 2026 0xHoneyJar)
- `CHANGELOG.md` (keep-a-changelog format)
- `SECURITY.md` (disclosure path)
- `CONTRIBUTING.md` (local-dev + test discipline)
- CI workflow `.github/workflows/ci.yml` (bun install + typecheck + test on PR/push)
- Loa framework mounted (`.loa/` submodule at v1.157.1 · `.claude/` symlinks)
- `BUTTERFREEZONE.md` agent-readable summary (auto-generated by framework)

### Changed
- Bin entry: `./src/bin/freeside.ts` → `./dist/bin/freeside.js` (npm-installable)
- Pinned `incur@0.4.5` (exact, no caret) — pre-1.0 semver hazard
- Version bumped from 0.1.0-alpha.0 → 0.2.0-alpha.0
- Internal CLI version (`src/cli.ts`, `src/commands/status.ts`) synced to 0.2.0-alpha.0

### Cycle
- Doctrine Made Active · simstim-20260513-2a174327 · Sprint 1
- PRD: `bonfire/grimoires/loa/prd.md`
- SDD: `bonfire/grimoires/loa/sdd.md`
- Sprint plan: `bonfire/grimoires/loa/sprint.md`

## [0.1.0-alpha.0] — 2026-05-13 — initial scaffold

### Added
- Sovereign CLI scaffold built on `incur@0.4.5`
- 8 zones materialized in `src/zones/manifest.ts` (discord-deploy · quests · auth · score · storage · worlds · characters · mediums)
- 5 worlds in `src/worlds/registry.ts` (purupuru · sprawl · mibera-dimensions · apdao · cubquests)
- Read-side verbs: `zones list/show` · `worlds list/show` · `doctor check` · `status summary`
- `--llms` + `--mcp` agent-discoverability surfaces built-in via incur
- 19 E2E tests · in-process via `cli.serve()` injection

### Doctrine
- Coined `zones-as-hexagonal-seam` candidate
- Re-coined `cli-as-substrate-construct-as-lens` (gecko 2026-05-12)
- Validated subway-doctrine alignment (every freeside-* IS the zone home)

### Fixes (operator correction 2026-05-13)
- score zone home: `score-mibera` → `freeside-score` (subway doctrine)
- Added `sonar` zone (freeside-sonar) — was missing
- Updated worlds claiming sonar (apdao · mibera-dimensions · cubquests)
- 21/21 tests pass after corrections
