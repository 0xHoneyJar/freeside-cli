# Contributing to freeside-cli

## Local development

Prerequisites:

- Node.js 20+
- bun 1.3+ (`curl -fsSL https://bun.sh/install | bash`)
- A clone of this repo

Setup:

```sh
git clone https://github.com/0xHoneyJar/freeside-cli.git
cd freeside-cli
bun install
```

Run the CLI in dev mode:

```sh
bun run src/bin/freeside.ts --help
bun run src/bin/freeside.ts zones list
bun run src/bin/freeside.ts doctor check
```

Run tests:

```sh
bun test
```

Build production output:

```sh
bun run build       # outputs dist/bin/freeside.js
node dist/bin/freeside.js --version
```

## Test discipline

- Every new verb or behavior change MUST add an E2E test in `tests/e2e.test.ts`
- Tests use `cli.serve(argv, { stdout, exit })` for in-process invocation (no subprocess)
- All tests must pass before merge: `bun test`
- TypeScript checks must pass: `bun run typecheck`
- CI enforces both gates

## Architecture

- CLI sovereign · construct (e.g. `construct-freeside`) is the LLM lens · they compose
- No LLM calls from inside this binary
- Built on [`incur`](https://github.com/) — `--llms` + `--mcp` + skill files come for free
- Zones declared in `src/zones/manifest.ts` (load-bearing data)
- Worlds declared in `src/worlds/registry.ts` (consumer registry)

See [`CLAUDE.md`](./CLAUDE.md) for agent-facing architecture notes.

## Commit conventions

We use conventional commits with scope-by-task:

```
feat(sprint-N): <description>     # new feature in a sprint
fix(sprint-N): <description>      # bug fix in a sprint
chore(...): <description>         # tooling/deps
docs(...): <description>          # doc-only
test(...): <description>          # tests
```

Co-authoring with AI agents is encouraged when applicable:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## PR review

- All PRs go through CI gate (typecheck + test must pass)
- Run-Bridge (Bridgebuilder) reviews are appreciated but not required for solo dev
- Tag major architectural changes with `[ARCH]` in the PR title for review priority

## Composing with the ecosystem

- Each `freeside-*` repo (auth · characters · mediums · quests · score · sonar · storage · worlds) is a zone home (the schema/port holder)
- Worlds consume zones; consumers are separate from zone homes (per subway doctrine)
- This CLI is the navigator across all zones; it imports zones' published packages

See `~/vault/wiki/concepts/freeside-as-subway.md` for the canonical doctrine.

## Releases

- Use `npm version <patch|minor|major>` to bump
- Update CHANGELOG.md
- Tag and push: `git push --follow-tags`
- `prepublishOnly` runs tests + build automatically before publish
