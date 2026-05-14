/**
 * Mock probe variants — deterministic test doubles.
 *
 * Used when:
 *   - Tests run (no network · no external state)
 *   - --probe mock flag explicit
 *   - isHeadless() triggers fallback to mock (operator can opt in via env)
 *
 * Each mock simulates the "happy path" by default. Tests that need
 * fault injection can compose alternate mocks via the Probe interface.
 */
import type { Zone } from '../../zones/manifest.ts'
import type { Probe, ProbeFinding } from '../types.ts'

export const githubMock: Probe = {
  name: 'github.mock',
  description: 'Mock GitHub probe · always returns clean (test only)',
  async probe(_zone: Zone): Promise<ProbeFinding[]> {
    return []
  },
}

export const npmMock: Probe = {
  name: 'npm.mock',
  description: 'Mock npm probe · always returns clean (test only)',
  async probe(_zone: Zone): Promise<ProbeFinding[]> {
    return []
  },
}

export const httpMock: Probe = {
  name: 'http.mock',
  description: 'Mock HTTP probe · always returns clean (test only)',
  async probe(_zone: Zone): Promise<ProbeFinding[]> {
    return []
  },
}

export const mockProbes = [githubMock, npmMock, httpMock]
