import { Cli, z } from 'incur'
import { ctaSchema, type CTA } from '../lib/cta.ts'

/**
 * Session commands.
 *
 * Per identity-spine doctrine: session = per-world JWT verification via JWKS.
 * Each world consumes the spine's JWT and validates against the canonical JWKS.
 *
 * v0.2 scaffold · v0.3 wires real JWT validation via jose or @0xhoneyjar/freeside-auth.
 */
export const session = Cli.create('session', {
  description: 'Session validation — per-world JWT consumption via JWKS. Top layer of identity spine.',
})

const notImplementedCta: CTA = {
  description: 'v0.2 ships verb scaffolding · JWT validation lands v0.3:',
  commands: [
    { command: 'zones show', args: { id: 'identity' }, description: 'Read the zone contract' },
    {
      command: 'credential test',
      args: { account: 'freeside-default' },
      description: 'Bottom layer is wired today',
    },
  ],
}

session.command('validate', {
  description: 'Validate a JWT against the spine JWKS (v0.3 · scaffold today).',
  args: z.object({ jwt: z.string() }),
  output: z.object({
    status: z.literal('not_implemented'),
    jwt_prefix: z.string(),
    layer: z.literal('session'),
    cta: ctaSchema,
  }),
  async run(c) {
    return c.ok(
      {
        status: 'not_implemented' as const,
        jwt_prefix: c.args.jwt.slice(0, 16),
        layer: 'session' as const,
        cta: notImplementedCta,
      },
      { cta: notImplementedCta },
    )
  },
})

session.command('verify-jwks', {
  description: 'Verify the JWKS endpoint of a configured issuer (v0.3).',
  args: z.object({ issuer: z.string() }),
  output: z.object({
    status: z.literal('not_implemented'),
    issuer: z.string(),
    layer: z.literal('session'),
    cta: ctaSchema,
  }),
  async run(c) {
    return c.ok(
      {
        status: 'not_implemented' as const,
        issuer: c.args.issuer,
        layer: 'session' as const,
        cta: notImplementedCta,
      },
      { cta: notImplementedCta },
    )
  },
})
