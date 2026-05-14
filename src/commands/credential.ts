import { Cli, z } from 'incur'
import { selectBackend, type CredentialBackend } from '../credentials/keychain.ts'
import { ctaSchema } from '../lib/cta.ts'

/**
 * Credential layer commands.
 *
 * Per identity-spine doctrine (vault://freeside-as-identity-spine):
 *   - credential = wallet sig / passkey / OAuth / OTP (this surface)
 *   - identity = canonical THJ user_id + JWT issuance (separate)
 *   - session = per-world JWT verification via JWKS (separate)
 *
 * Three orthogonal layers. Verb expressivity teaches the distinction
 * agents reading via MCP see `credential add` and `identity show` as
 * structurally different operations.
 */
export const credential = Cli.create('credential', {
  description: 'Credential adapters — wallet sig / passkey / OAuth / OTP. Bottom layer of identity spine.',
})

const backendEnum = z.enum(['auto', 'os', 'memory', 'file'])

credential.command('add', {
  description: 'Store a credential (JWT or opaque token) under an account name.',
  args: z.object({
    account: z.string().describe('Account identifier · namespace per tenant/world'),
  }),
  options: z.object({
    token: z.string().optional().describe('Credential value · prompted if absent (TTY only)'),
    backend: backendEnum.default('auto').describe('Storage backend'),
    ttlMs: z.coerce.number().optional().describe('Time-to-live in milliseconds · default no expiry'),
  }),
  output: z.object({
    account: z.string(),
    backend: z.string(),
    ttlMs: z.number().nullable(),
    cta: ctaSchema,
  }),
  examples: [
    { args: { account: 'freeside-default' }, options: { token: '<JWT>' }, description: 'Store with auto backend' },
    {
      args: { account: 'cubquests' },
      options: { token: '<JWT>', backend: 'file', ttlMs: 3600000 },
      description: 'File backend · 1h TTL',
    },
  ],
  async run(c) {
    const token = c.options.token
    if (!token) {
      return c.error({
        code: 'TOKEN_REQUIRED',
        message: '--token required (interactive prompt not yet supported · v0.3 work)',
        retryable: true,
        cta: {
          description: 'Provide --token:',
          commands: [
            {
              command: 'credential add',
              args: { account: c.args.account },
              options: { token: 'YOUR_JWT_HERE' },
              description: 'Pass token via flag',
            },
          ],
        },
      })
    }
    const backend = selectBackend(c.options.backend as CredentialBackend)
    await backend.store(c.args.account, token, c.options.ttlMs)
    const cta = {
      description: 'Next:',
      commands: [
        {
          command: 'credential list',
          options: { backend: c.options.backend },
          description: 'Verify stored credentials',
        },
        {
          command: 'identity show',
          args: { user_id: c.args.account },
          description: 'Resolve identity from credential (when wired to spine)',
        },
      ],
    }
    return c.ok(
      {
        account: c.args.account,
        backend: backend.backend,
        ttlMs: c.options.ttlMs ?? null,
        cta,
      },
      { cta },
    )
  },
})

credential.command('list', {
  description: 'List all stored credential accounts (does NOT reveal tokens).',
  options: z.object({
    backend: backendEnum.default('auto').describe('Storage backend'),
  }),
  output: z.object({
    backend: z.string(),
    accounts: z.array(z.string()),
    cta: ctaSchema,
  }),
  async run(c) {
    const backend = selectBackend(c.options.backend as CredentialBackend)
    const accounts = await backend.list()
    const cta = {
      description: 'Next:',
      commands: [
        {
          command: 'credential test',
          args: { account: accounts[0] ?? 'freeside-default' },
          description: 'Verify retrieval works for an account',
        },
      ],
    }
    return c.ok({ backend: backend.backend, accounts, cta }, { cta })
  },
})

credential.command('test', {
  description: 'Test that retrieval works for an account · returns token-present indicator (NOT the token).',
  args: z.object({ account: z.string() }),
  options: z.object({
    backend: backendEnum.default('auto').describe('Storage backend'),
  }),
  output: z.object({
    account: z.string(),
    backend: z.string(),
    present: z.boolean(),
    expiresAt: z.number().nullable(),
    cta: ctaSchema,
  }),
  async run(c) {
    const backend = selectBackend(c.options.backend as CredentialBackend)
    const rec = await backend.retrieve(c.args.account)
    const cta = {
      description: 'Next:',
      commands: rec
        ? [
            {
              command: 'session validate',
              options: { jwt: 'STORED' },
              description: 'Validate the stored token shape (next layer up)',
            },
          ]
        : [
            {
              command: 'credential add',
              args: { account: c.args.account },
              options: { token: 'YOUR_JWT' },
              description: 'Account not found · add a credential first',
            },
          ],
    }
    return c.ok(
      {
        account: c.args.account,
        backend: backend.backend,
        present: !!rec,
        expiresAt: rec?.expiresAt ?? null,
        cta,
      },
      { cta },
    )
  },
})
