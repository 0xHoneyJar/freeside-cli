import { Cli, z } from 'incur'
import { ctaSchema, type CTA } from '../lib/cta.ts'

/**
 * Identity spine commands.
 *
 * Per identity-spine doctrine (vault://freeside-as-identity-spine):
 *   - credential = adapter inputs (wallet/passkey/oauth/otp)
 *   - identity = canonical THJ user_id + JWT issuance (THIS SURFACE)
 *   - session = per-world JWT verification
 *
 * In v0.2 these verbs are SCAFFOLD ONLY — they document the verb taxonomy
 * (which teaches the three-layer doctrine via structural expressivity)
 * and return NOT_IMPLEMENTED with clear CTAs to the upstream gates
 * (freeside-auth#3 companion publish · construct-immune-system materialization).
 *
 * v0.3 wires real spine calls via @0xhoneyjar/freeside-auth-adapters/jwt-engine.
 */
export const identity = Cli.create('identity', {
  description: 'Identity spine — canonical THJ user_id + JWT issuance. Middle layer of identity spine.',
})

const notImplementedCta: CTA = {
  description: 'v0.2 ships verb scaffolding · spine wiring lands v0.3:',
  commands: [
    { command: 'credential add', description: 'Bottom layer · ships in v0.2 ✓' },
    { command: 'zones show', args: { id: 'identity' }, description: 'Read the zone contract' },
  ],
}

identity.command('show', {
  description: 'Resolve canonical user_id to identity record (v0.3 · scaffold today).',
  args: z.object({ user_id: z.string() }),
  output: z.object({
    status: z.literal('not_implemented'),
    user_id: z.string(),
    layer: z.literal('identity'),
    cta: ctaSchema,
  }),
  async run(c) {
    return c.ok(
      {
        status: 'not_implemented' as const,
        user_id: c.args.user_id,
        layer: 'identity' as const,
        cta: notImplementedCta,
      },
      { cta: notImplementedCta },
    )
  },
})

identity.command('link', {
  description: 'Link a credential to a canonical identity (v0.3 · scaffold today).',
  args: z.object({ credential_id: z.string() }),
  output: z.object({
    status: z.literal('not_implemented'),
    credential_id: z.string(),
    layer: z.literal('identity'),
    cta: ctaSchema,
  }),
  async run(c) {
    return c.ok(
      {
        status: 'not_implemented' as const,
        credential_id: c.args.credential_id,
        layer: 'identity' as const,
        cta: notImplementedCta,
      },
      { cta: notImplementedCta },
    )
  },
})

identity.command('whoami', {
  description: 'Resolve current operator-bound identity from stored credentials (v0.3).',
  output: z.object({
    status: z.literal('not_implemented'),
    layer: z.literal('identity'),
    cta: ctaSchema,
  }),
  async run(c) {
    return c.ok(
      {
        status: 'not_implemented' as const,
        layer: 'identity' as const,
        cta: notImplementedCta,
      },
      { cta: notImplementedCta },
    )
  },
})
