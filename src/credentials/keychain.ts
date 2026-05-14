/**
 * Keychain credential adapter — three backends with FR-KEY-5 graceful degradation.
 *
 * Per PRD §4.4 (Doctrine Made Active):
 *   - os backend  — OS native keychain (macOS Keychain · linux secret-service · Windows DPAPI)
 *                   STUB in v0.2 · operator-installable optional dep in v0.3+
 *   - memory       — in-process Map with explicit TTL (1h default · operator-tunable)
 *   - file        — AES-256-GCM encrypted file at ~/.freeside/credentials.enc
 *                   keyed by FREESIDE_CRED_KEY env (16+ chars)
 *
 * Auto-detection (--backend auto):
 *   - if isHeadless() → file (no daemon assumption)
 *   - else attempt os · fall back to file on NOT_IMPLEMENTED
 *
 * v0.3+: replace os stub with @0xhoneyjar/freeside-auth-adapters/keychain (companion
 * publish · freeside-auth#3). For v0.2 ALPHA, inline impl per PRD §7.1 R4 fallback.
 *
 * Three-layer doctrine respected: this is a CREDENTIAL adapter, NOT identity-layer
 * code. The spine (canonical user_id + JWT issuance) lives elsewhere (freeside-auth).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { isHeadless } from '../probe/types.ts'

export type CredentialBackend = 'auto' | 'os' | 'memory' | 'file'

export interface CredentialRecord {
  account: string
  token: string
  expiresAt: number | null // unix ms · null = no expiry
}

export interface KeychainAdapter {
  backend: CredentialBackend
  /** Store a credential. Idempotent: re-store overwrites with new TTL. */
  store(account: string, token: string, ttlMs?: number): Promise<void>
  /** Retrieve. Returns null when not-found OR expired. */
  retrieve(account: string): Promise<CredentialRecord | null>
  /** Remove a credential. No-op when not-found. */
  remove(account: string): Promise<void>
  /** List all stored accounts (NOT the tokens). For `freeside credential list`. */
  list(): Promise<string[]>
}

// ---------- memory backend ----------

class MemoryKeychain implements KeychainAdapter {
  backend: CredentialBackend = 'memory'
  private store_ = new Map<string, CredentialRecord>()

  async store(account: string, token: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null
    this.store_.set(account, { account, token, expiresAt })
  }

  async retrieve(account: string): Promise<CredentialRecord | null> {
    const rec = this.store_.get(account)
    if (!rec) return null
    if (rec.expiresAt !== null && Date.now() > rec.expiresAt) {
      this.store_.delete(account)
      return null
    }
    return rec
  }

  async remove(account: string): Promise<void> {
    this.store_.delete(account)
  }

  async list(): Promise<string[]> {
    return [...this.store_.keys()]
  }
}

// ---------- file backend ----------

const FILE_DIR = join(homedir(), '.freeside')
const FILE_PATH = join(FILE_DIR, 'credentials.enc')
const ALGO = 'aes-256-gcm'

interface FileStoreShape {
  records: Record<string, { token: string; expiresAt: number | null }>
}

function deriveKey(): Buffer {
  const env = process.env.FREESIDE_CRED_KEY
  if (!env || env.length < 16) {
    throw new Error(
      '[freeside-cli] FREESIDE_CRED_KEY env var required for file backend (16+ chars). ' +
        'Generate: openssl rand -hex 32',
    )
  }
  // scrypt-derive a 32-byte key from the env passphrase + a fixed-app salt.
  // Salt is non-secret · derivation discipline matters more than salt-secrecy here.
  return scryptSync(env, 'freeside-cli-v0.2', 32)
}

function loadFile(): FileStoreShape {
  if (!existsSync(FILE_PATH)) return { records: {} }
  const raw = readFileSync(FILE_PATH)
  if (raw.length < 28) return { records: {} }
  // layout: [12 IV][16 AUTH_TAG][...CIPHERTEXT]
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ct = raw.subarray(28)
  const decipher = createDecipheriv(ALGO, deriveKey(), iv)
  decipher.setAuthTag(tag)
  try {
    const plain = Buffer.concat([decipher.update(ct), decipher.final()])
    return JSON.parse(plain.toString('utf-8')) as FileStoreShape
  } catch {
    throw new Error(
      '[freeside-cli] credentials.enc decryption failed · FREESIDE_CRED_KEY may have changed',
    )
  }
}

function saveFile(data: FileStoreShape): void {
  if (!existsSync(FILE_DIR)) mkdirSync(FILE_DIR, { recursive: true, mode: 0o700 })
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const plain = Buffer.from(JSON.stringify(data), 'utf-8')
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  writeFileSync(FILE_PATH, Buffer.concat([iv, tag, ct]), { mode: 0o600 })
}

class FileKeychain implements KeychainAdapter {
  backend: CredentialBackend = 'file'

  async store(account: string, token: string, ttlMs?: number): Promise<void> {
    const data = loadFile()
    data.records[account] = { token, expiresAt: ttlMs ? Date.now() + ttlMs : null }
    saveFile(data)
  }

  async retrieve(account: string): Promise<CredentialRecord | null> {
    const data = loadFile()
    const rec = data.records[account]
    if (!rec) return null
    if (rec.expiresAt !== null && Date.now() > rec.expiresAt) {
      delete data.records[account]
      saveFile(data)
      return null
    }
    return { account, token: rec.token, expiresAt: rec.expiresAt }
  }

  async remove(account: string): Promise<void> {
    const data = loadFile()
    if (!(account in data.records)) return
    delete data.records[account]
    saveFile(data)
  }

  async list(): Promise<string[]> {
    return Object.keys(loadFile().records)
  }
}

// ---------- os backend (stub) ----------

class OsKeychainStub implements KeychainAdapter {
  backend: CredentialBackend = 'os'

  private throwNotImplemented(): never {
    throw new Error(
      '[freeside-cli] os keychain backend is NOT YET IMPLEMENTED in v0.2. ' +
        'Migration to @0xhoneyjar/freeside-auth-adapters/keychain ships in v0.3 ' +
        '(companion: freeside-auth#3 · operator-paced). ' +
        'For now: use --backend file (encrypted file · FREESIDE_CRED_KEY env required) ' +
        'or --backend memory (ephemeral · in-process).',
    )
  }

  async store(): Promise<void> {
    this.throwNotImplemented()
  }
  async retrieve(): Promise<CredentialRecord | null> {
    this.throwNotImplemented()
  }
  async remove(): Promise<void> {
    this.throwNotImplemented()
  }
  async list(): Promise<string[]> {
    this.throwNotImplemented()
  }
}

// ---------- backend selection ----------

// Module-level singletons: memory must persist across multiple cli command
// dispatches within a single process (otherwise `add` + `test` calls during
// the same session see empty stores).
let memoryInstance: MemoryKeychain | null = null
function getMemory(): MemoryKeychain {
  if (!memoryInstance) memoryInstance = new MemoryKeychain()
  return memoryInstance
}

/**
 * Select credential backend per FR-KEY-5.
 *
 * 'auto' resolution:
 *   - headless (CI / GITHUB_ACTIONS / LOA_HEADLESS) → file (encrypted)
 *   - else → file (since os stub throws in v0.2)
 *
 * Operator explicit `--backend` overrides auto.
 *
 * Memory backend is a module-level singleton (process-scoped) so add/test
 * within the same CLI invocation see the same store.
 */
export function selectBackend(requested: CredentialBackend = 'auto'): KeychainAdapter {
  if (requested === 'memory') return getMemory()
  if (requested === 'file') return new FileKeychain()
  if (requested === 'os') return new OsKeychainStub()
  // auto
  if (isHeadless()) return new FileKeychain()
  return new FileKeychain()
}

// Test-only escape hatch (clears the singleton between tests · NOT exposed via CLI).
export function _resetMemoryForTests(): void {
  memoryInstance = null
}
