import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveEnvKey } from '../env'

describe('resolveEnvKey', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('resolves from explicit bindings', () => {
    process.env.MY_VAR = 'hello'
    const bindings = new Map([['database.host', ['MY_VAR']]])
    expect(resolveEnvKey('database.host', '', bindings, false)).toBe('hello')
  })

  it('returns first matching binding', () => {
    process.env.SECOND = 'found'
    const bindings = new Map([['key', ['FIRST', 'SECOND']]])
    expect(resolveEnvKey('key', '', bindings, false)).toBe('found')
  })

  it('resolves via autoEnv with prefix', () => {
    process.env.APP_DATABASE_HOST = 'localhost'
    expect(resolveEnvKey('database.host', 'APP', new Map(), true)).toBe('localhost')
  })

  it('resolves via autoEnv without prefix', () => {
    process.env.DATABASE_HOST = '127.0.0.1'
    expect(resolveEnvKey('database.host', '', new Map(), true)).toBe('127.0.0.1')
  })

  it('returns undefined when nothing matches', () => {
    expect(resolveEnvKey('nonexistent', 'APP', new Map(), true)).toBeUndefined()
  })

  it('explicit bindings take precedence over autoEnv', () => {
    process.env.CUSTOM = 'custom'
    process.env.APP_DB_HOST = 'auto'
    const bindings = new Map([['db.host', ['CUSTOM']]])
    expect(resolveEnvKey('db.host', 'APP', bindings, true)).toBe('custom')
  })

  it('reads live env values (not cached)', () => {
    const bindings = new Map([['key', ['LIVE_VAR']]])
    expect(resolveEnvKey('key', '', bindings, false)).toBeUndefined()
    process.env.LIVE_VAR = 'now-set'
    expect(resolveEnvKey('key', '', bindings, false)).toBe('now-set')
  })
})
