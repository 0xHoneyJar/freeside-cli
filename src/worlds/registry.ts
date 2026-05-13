/**
 * Worlds registry — stub for v0.1.
 *
 * In v1.0 this reads from `freeside-worlds` package (the registry zone's
 * live adapter). For v0.1 it's an in-repo declaration mirroring what
 * the registry would expose, so the CLI surface is testable today
 * without waiting on the freeside-worlds zone-contract to crystallize.
 *
 * Each world declares which zones it claims to honor. `freeside doctor`
 * cross-references this with the zones manifest to surface drift.
 */

export interface World {
  id: string
  domain?: string
  zones_claimed: string[]
  substrate: {
    /** primary deployment platform */
    deploy: 'vercel' | 'railway' | 'self-hosted'
    /** primary data store */
    data?: 'railway-postgres' | 'supabase' | 'convex' | 'self-hosted' | 'none'
  }
  status: 'live' | 'staging' | 'archived' | 'planned'
  repo?: string
  notes?: string
}

export const WORLDS: World[] = [
  {
    id: 'purupuru',
    domain: 'purupuru.world',
    zones_claimed: ['characters', 'mediums', 'storage', 'auth'],
    substrate: { deploy: 'vercel', data: 'convex' },
    status: 'live',
    repo: 'world-purupuru',
    notes: 'Ghibli-warm honey magic · sonar self-hosted at purupuru-sonar-ref',
  },
  {
    id: 'sprawl',
    domain: 'sprawl.world',
    zones_claimed: ['characters', 'storage', 'auth', 'score'],
    substrate: { deploy: 'vercel', data: 'convex' },
    status: 'live',
    repo: 'sprawl-world',
    notes: 'CRT cyberpunk · rektdrop + dimensions',
  },
  {
    id: 'mibera-dimensions',
    domain: 'dimensions.0xhoneyjar.xyz',
    zones_claimed: ['characters', 'storage', 'score', 'auth', 'sonar'],
    substrate: { deploy: 'vercel', data: 'convex' },
    status: 'live',
    repo: 'mibera-dimensions',
    notes: 'Sticker substrate · 33-canvas observer pipeline',
  },
  {
    id: 'apdao',
    domain: 'apiologydao.0xhoneyjar.xyz',
    zones_claimed: ['auth', 'score', 'sonar'],
    substrate: { deploy: 'vercel', data: 'railway-postgres' },
    status: 'live',
    repo: 'apdao-auction-house',
    notes: 'Drizzle migration complete · Railway Postgres · multicall snapshot · sonar via freeside-sonar GraphQL',
  },
  {
    id: 'cubquests',
    domain: 'cubquests.com',
    zones_claimed: ['quests', 'auth', 'storage', 'sonar'],
    substrate: { deploy: 'vercel', data: 'supabase' },
    status: 'live',
    repo: 'world-sprawl/cubquests-dashboard',
    notes:
      'Source-of-truth for quests-zone extraction · reverse-extraction test pending (PRD lane B1) · indexer events via sonar',
  },
]

export function findWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id)
}
