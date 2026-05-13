/**
 * Zones manifest — the typed-port surfaces Freeside exposes as contracts.
 *
 * A zone is a hexagonal seam Freeside contracts on. Teams deploying on
 * Freeside pick the zones they need and honor the port + schema.
 *
 * Substrate (vercel/railway/aws/etc) lives in the live adapter, not the
 * zone itself. Sovereign infra is an option, not a requirement.
 *
 * Doctrine: [[freeside-modules-as-installables]] +
 * [[cli-as-substrate-construct-as-lens]] + honeycomb/effect-substrate.
 */

export type ZoneStatus = 'active' | 'draft' | 'aspirational' | 'extracted'

export type Substrate =
  | 'vercel'
  | 'railway'
  | 'aws'
  | 'cloudflare'
  | 'discord-api'
  | 'self-hosted'
  | 'tbd'

export interface LiveAdapter {
  name: string
  substrate: Substrate
  package?: string
  notes?: string
}

export interface Zone {
  /** kebab-case identifier; how teams reference the zone */
  id: string
  /** one-line description of what this zone contracts on */
  description: string
  /** load-bearing port interfaces (hexagonal seams teams honor) */
  ports: string[]
  /** schemas teams write against (typically TS/Zod or Effect) */
  schemas: string[]
  /** repo or workspace where this zone's port + schema lives */
  home: string
  /** known live adapter implementations + their substrates */
  adapters: LiveAdapter[]
  /** lifecycle stage */
  status: ZoneStatus
  /** known consumers — worlds that claim to honor this zone */
  consumers: string[]
  /** tiering signal — does Freeside offer a managed tier for this zone? */
  tiering?: {
    free: string
    managed?: string
  }
  /** open gaps surfaced by this zone's current state */
  gaps?: string[]
}

/**
 * The canonical zones list — v0.1.
 *
 * Operator-named priority (2026-05-13): discord-deploy + quests + auth
 * surface first. score named as tiering exemplar. storage/worlds/mediums/
 * characters included for navigation completeness.
 */
export const ZONES: Zone[] = [
  {
    id: 'discord-deploy',
    description:
      'Discord server provisioning + role + verification deployment. Was core to Freeside originally; now extracted.',
    ports: ['IDiscordDeployer', 'IRoleSync', 'IVerificationFlow'],
    schemas: ['discord-server.yaml', 'RoleSpec', 'VerificationSpec'],
    home: 'freeside-discord-deploy (NEW — not yet created)',
    adapters: [
      {
        name: 'discord-api-live',
        substrate: 'discord-api',
        notes:
          'Wraps @discordjs/rest. Existing artifact: loa-freeside/packages/cli (gaib) has prior patterns to mine.',
      },
    ],
    status: 'aspirational',
    consumers: [],
    tiering: {
      free: 'team brings own Discord bot token',
      managed: 'Freeside-hosted bot · multi-tenant token isolation',
    },
    gaps: [
      'no port file extant — needs extraction from gaib',
      'no schema published — discord-server.yaml lives only inside gaib',
      'no live adapter package yet',
      'verification flow shape unclear (role grant on wallet-sign?)',
    ],
  },
  {
    id: 'quests',
    description:
      'Quest definition, publishing, completion tracking, badge issuance.',
    ports: ['IQuestEngine', 'IQuestPublisher', 'IQuestIndexer'],
    schemas: ['Quest', 'QuestPublishInput', 'QuestCompletion', 'Badge'],
    home: 'freeside-quests',
    adapters: [
      {
        name: 'supabase-live',
        substrate: 'railway',
        notes:
          'Existing adapter pattern inside cubquests-dashboard · candidate for extraction to @0xhoneyjar/quests-adapters/supabase',
      },
    ],
    status: 'extracted',
    consumers: ['cubquests-dashboard (unverified · reverse-extraction test pending PRD lane B1)'],
    tiering: {
      free: 'team brings own DB + Supabase project',
      managed: 'Freeside-hosted quest pipeline (post-tiering)',
    },
    gaps: [
      'zero consumers yet · reverse-extraction test (PRD lane B1) is the falsification gate',
      'no Vercel/Railway adapter published — only inline cubquests pattern',
      'IQuestIndexer port shape unclear — subsquid integration in EXTRACTION-MAP but unbuilt',
    ],
  },
  {
    id: 'auth',
    description:
      'Identity, sessions, tenants, wallet-linking. Every other zone depends on this.',
    ports: ['IAuthProvider', 'ISessionStore', 'ITenantBoundary'],
    schemas: ['Identity', 'Session', 'Tenant', 'WalletLink'],
    home: 'freeside-auth',
    adapters: [
      {
        name: 'jwt-live',
        substrate: 'railway',
        notes:
          'Engine package landed 2026-05-06 sprint-1 in 6-package shape (protocol/ports/adapters/engine/mcp-tools/ui).',
      },
      {
        name: 'keychain-cli-live',
        substrate: 'self-hosted',
        notes:
          'CLI uses OS keychain (macOS Keychain / linux secret-service / Windows credential manager) for token storage. NEW adapter for v0.1.',
      },
    ],
    status: 'active',
    consumers: ['(no cross-@0xhoneyjar consumer yet — freeside-cli is the first)'],
    tiering: {
      free: 'team brings own JWT signing key',
      managed: 'Freeside-issued JWKS · multi-tenant signing keys at loa-freeside/apps/gateway',
    },
    gaps: [
      'no cross-module consumer yet — composition-thesis unproven',
      'wallet-link port shape may diverge from existing apdao-auction-house pattern · needs reconciliation',
      'tenant boundary semantics under-specified for multi-world deployments',
    ],
  },
  {
    id: 'score',
    description:
      'Behavior scoring pipeline. The OG of Freeside service-tiering — operator-named exemplar 2026-05-13.',
    ports: ['IScoreEngine', 'IScoreQuery', 'ISnapshotWriter'],
    schemas: ['ScoreEvent', 'Snapshot', 'ScoreSchema'],
    home: 'score-mibera (current production · publishes beacon.yaml)',
    adapters: [
      {
        name: 'drizzle-postgres-live',
        substrate: 'railway',
        notes:
          'score-api@0.6.0 on Railway · drizzle-orm + pg + viem · trigger.dev for jobs.',
      },
      {
        name: 'beacon-mcp-live',
        substrate: 'railway',
        notes: 'Score MCP at mcp.0xhoneyjar.xyz · 9 tools via beacon.yaml.',
      },
    ],
    status: 'active',
    consumers: ['mibera-dimensions', 'score-dashboard'],
    tiering: {
      free: 'self-host the score pipeline (drizzle + trigger.dev recipe)',
      managed: 'Freeside-hosted scoring · per-collection pricing · tier-by-event-volume',
    },
    gaps: [
      'beacon-schema split between freeside-mcp-gateway + score-mibera — single source of truth unclear',
      'no IScoreEngine port file extant — implementations are direct service-shape, not port-shape',
      'tiering boundary undefined — what counts as "your" score vs "Freeside" score',
    ],
  },
  {
    id: 'storage',
    description: 'Asset storage + variant generation + CDN routing.',
    ports: ['IAssetStorage', 'IVariantPipeline', 'IAssetResolver'],
    schemas: ['AssetRef', 'Variant', 'AssetSource'],
    home: 'freeside-storage',
    adapters: [
      {
        name: 'r2-live',
        substrate: 'cloudflare',
        notes: 'Cloudflare R2 mirror · used by freeside-characters PFP path.',
      },
      {
        name: 'mirroring-storage-live',
        substrate: 'cloudflare',
        notes: 'Shadow-mirror existing chains · skill exists in construct-freeside.',
      },
    ],
    status: 'active',
    consumers: ['freeside-characters', 'mibera-dimensions (via sticker substrate)'],
    tiering: {
      free: 'team brings own R2/S3 bucket',
      managed: 'Freeside-hosted asset CDN · per-GB billing',
    },
    gaps: [
      'variant pipeline shape not yet ported · transforms live inline in characters',
      'no fallback policy schema — divergence between text/PFP/abbrev/generic surfaces is unspecified',
    ],
  },
  {
    id: 'worlds',
    description:
      'The world registry. Lists worlds, their claimed zones, their substrates, their deployments.',
    ports: ['IWorldRegistry', 'IWorldManifest'],
    schemas: ['World', 'WorldManifest', 'ZoneClaim'],
    home: 'freeside-worlds',
    adapters: [
      {
        name: 'in-repo-yaml-live',
        substrate: 'self-hosted',
        notes:
          'Worlds declared via YAML in-repo · 13 days steady since freeside-world → freeside-worlds rename (2026-04-29).',
      },
    ],
    status: 'draft',
    consumers: ['(none yet · this CLI is the first consumer)'],
    gaps: [
      'no WorldManifest schema published',
      'no ZoneClaim shape — how a world declares which zones it honors is unspecified',
      'no validation surface — `freeside worlds validate <world>` does not exist yet',
    ],
  },
  {
    id: 'characters',
    description: 'Character voice + persona + chathead instance routing.',
    ports: ['ICharacterRouter', 'IPersonaCompositor', 'IMediumBinding'],
    schemas: ['CharacterSpec', 'PersonaProfile', 'ChatHead'],
    home: 'freeside-characters',
    adapters: [
      {
        name: 'inline-composer-live',
        substrate: 'vercel',
        notes:
          'V0.7-A.4 cap-mistune in prod · composeWithImage + grail-ref-guard + persona anti-hallucination.',
      },
    ],
    status: 'active',
    consumers: ['(no cross-module consumer — characters runs as its own service)'],
    gaps: [
      'no formal port — character composition is service-shape, not port-shape',
      'medium-binding seam exists (cmp-boundary cycle) but not exposed as zone contract',
    ],
  },
  {
    id: 'mediums',
    description: 'Medium registry + capability routing (chathead, web, discord, etc).',
    ports: ['IMediumRegistry', 'IMediumCapability', 'IDeliveryAdapter'],
    schemas: ['MediumSpec', 'Capability', 'DeliveryEnvelope'],
    home: 'freeside-mediums',
    adapters: [
      {
        name: 'medium-registry-live',
        substrate: 'self-hosted',
        notes:
          '@0xhoneyjar/medium-registry@0.2.0 + cli-renderer@0.1.0 · cmp-boundary cycle shipped 2026-05-04.',
      },
    ],
    status: 'active',
    consumers: ['freeside-characters', 'freeside-quests (planned)'],
    gaps: [
      'discord-deploy zone overlaps with mediums.discord-capability — boundary unclear',
      'CLAUDE.md missing in freeside-mediums (gecko bazaar-scan finding · pattern drift)',
    ],
  },
]

export function findZone(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id)
}

export function zonesByStatus(status: ZoneStatus): Zone[] {
  return ZONES.filter((z) => z.status === status)
}
