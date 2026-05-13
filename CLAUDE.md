# freeside-cli · agent instructions

> Sovereign deterministic CLI. No LLM calls from inside this binary. The construct (`construct-freeside`) is the lens.

## What this is

A typescript CLI built on [`incur`](https://github.com/) that surfaces Freeside's hexagonal zones as agent-callable verbs. Every command emits structured output (TOON default, JSON optional, `--llms` for manifest, `--mcp` for MCP stdio server).

## Architecture

```
src/
├── bin/freeside.ts        ← entry · calls cli.serve()
├── cli.ts                  ← Cli.create('freeside') + .command() wiring
├── zones/
│   └── manifest.ts         ← THE zones taxonomy data · v0.1 in-repo · v1.0 reads from freeside-worlds
├── worlds/
│   └── registry.ts         ← stub world registry · v0.1 in-repo
└── commands/
    ├── zones.ts            ← `freeside zones list/show`
    ├── worlds.ts           ← `freeside worlds list/show`
    ├── doctor.ts           ← `freeside doctor check` (structural drift probe)
    └── status.ts           ← `freeside status summary`
```

The zones manifest in `src/zones/manifest.ts` is the load-bearing data shape. **Editing it changes what zones Freeside claims to expose.** Every zone declares: id, ports, schemas, home (repo), live adapters + substrate, status, consumers, tiering model, gaps.

## When working in this repo

- **Adding a zone**: append a `Zone` object to `ZONES` array in `src/zones/manifest.ts`. Declare ports/schemas/home/adapters/status/consumers/gaps. The CLI surface auto-updates — no command code changes needed for v0.1 read-side.
- **Wiring a live adapter**: in v0.1 adapters are described (name/substrate/notes) not invoked. v0.2+ adds `live/<adapter>.live.ts` files that the doctor command will probe over HTTP.
- **Adding a verb**: create `src/commands/<verb>.ts` exporting a `Cli.create('verb', ...)` chain. Register in `src/cli.ts` with `cli.command(<verb>)`. Use `output:` Zod schema for return typing.
- **CTAs**: every successful response should include `cta.commands` pointing at next-likely invocations. Errors should include CTAs for self-correction (e.g. `freeside zones list` if a zone id was wrong).

## Doctrine boundaries (NEVER cross)

- **NEVER** make LLM calls from inside this CLI. The construct layer interprets; the CLI is deterministic.
- **NEVER** add a verb that requires the construct to interpret its output as semantically meaningful. All output is structural data the construct *reads*, never the reverse.
- **NEVER** silently swallow errors. Use `c.error({ code, message, retryable, cta })` for explicit failure envelopes.

## Composes with

- `construct-honeycomb-substrate` / `construct-effect-substrate` — four-folder grammar (`domain/ports/live/mock`)
- `construct-freeside` — the LLM lens that knows when to invoke CLI verbs
- `freeside-auth`, `freeside-worlds`, `freeside-quests`, ... — zone homes whose port contracts this CLI surfaces

## Status

v0.1 read-side. Live-adapter probing + write-side verbs (`deploy`, `install`, `auth login`) shipping incrementally as upstream zones materialize their port contracts.
