/**
 * Shared CTA (Call to Action) schema.
 *
 * Embedded in every command's `output:` schema so CTAs survive MCP
 * serialization (they appear in `structuredContent`). Also passed via
 * `c.ok(data, { cta })` so incur's TTY envelope rendering stays clean.
 *
 * One CTA value · two surfaces · zero drift.
 *
 * Doctrine: CLI sovereign · construct is the lens · they compose. CTAs are
 * how the CLI tells the lens what to invoke next. Losing them on the MCP
 * path defeats the design (see freeside-cli#3 F-HIGH-2 path A).
 */
import { z } from 'incur'

export const ctaCommandSchema = z.object({
  command: z.string(),
  args: z.record(z.string(), z.any()).optional(),
  options: z.record(z.string(), z.any()).optional(),
  description: z.string().optional(),
})

export const ctaSchema = z.object({
  description: z.string(),
  commands: z.array(ctaCommandSchema),
})

export type CTA = z.infer<typeof ctaSchema>
export type CTACommand = z.infer<typeof ctaCommandSchema>
