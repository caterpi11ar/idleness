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

  describe('explicit bindings', () => {
    it('resolves from explicit bindings', () => {
      process.env.MY_VAR = 'hello'
      const bindings = new Map([['database.host', ['MY_VAR']]])
      expect(resolveEnvKey('database.host', '', bindings, false)).toBe('hello')
    })

    it('returns first matching binding when multiple are set', () => {
      process.env.FIRST = 'first-val'
      process.env.SECOND = 'second-val'
      const bindings = new Map([['key', ['FIRST', 'SECOND']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBe('first-val')
    })

    it('skips unset bindings and returns first defined', () => {
      process.env.SECOND = 'found'
      const bindings = new Map([['key', ['FIRST', 'SECOND']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBe('found')
    })

    it('returns undefined when bindings exist but none are set', () => {
      const bindings = new Map([['key', ['NOT_SET_A', 'NOT_SET_B']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBeUndefined()
    })

    it('returns empty string when env var is set to empty string', () => {
      process.env.MY_VAR = ''
      const bindings = new Map([['key', ['MY_VAR']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBe('')
    })
  })

  describe('automaticEnv', () => {
    it('resolves via autoEnv with prefix', () => {
      process.env.APP_DATABASE_HOST = 'localhost'
      expect(resolveEnvKey('database.host', 'APP', new Map(), true)).toBe('localhost')
    })

    it('resolves via autoEnv without prefix', () => {
      process.env.DATABASE_HOST = '127.0.0.1'
      expect(resolveEnvKey('database.host', '', new Map(), true)).toBe('127.0.0.1')
    })

    it('returns undefined when autoEnv is disabled', () => {
      process.env.DATABASE_HOST = 'localhost'
      expect(resolveEnvKey('database.host', '', new Map(), false)).toBeUndefined()
    })

    it('uppercases derived env var name', () => {
      process.env.APP_DB_HOST = 'myhost'
      expect(resolveEnvKey('db.host', 'APP', new Map(), true)).toBe('myhost')
    })

    it('replaces dots with underscores', () => {
      process.env.A_B_C = 'val'
      expect(resolveEnvKey('a.b.c', '', new Map(), true)).toBe('val')
    })

    it('returns undefined when auto-derived env var is not set', () => {
      expect(resolveEnvKey('nonexistent', 'APP', new Map(), true)).toBeUndefined()
    })
  })

  describe('precedence', () => {
    it('explicit bindings take precedence over autoEnv', () => {
      process.env.CUSTOM = 'custom'
      process.env.APP_DB_HOST = 'auto'
      const bindings = new Map([['db.host', ['CUSTOM']]])
      expect(resolveEnvKey('db.host', 'APP', bindings, true)).toBe('custom')
    })

    it('falls back to autoEnv when explicit bindings are not set', () => {
      process.env.APP_DB_HOST = 'auto-val'
      const bindings = new Map([['db.host', ['NOT_SET']]])
      expect(resolveEnvKey('db.host', 'APP', bindings, true)).toBe('auto-val')
    })
  })

  describe('live reads', () => {
    it('reads live env values (not cached)', () => {
      const bindings = new Map([['key', ['LIVE_VAR']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBeUndefined()
      process.env.LIVE_VAR = 'now-set'
      expect(resolveEnvKey('key', '', bindings, false)).toBe('now-set')
    })

    it('reflects env var deletion', () => {
      process.env.DYNAMIC = 'exists'
      const bindings = new Map([['key', ['DYNAMIC']]])
      expect(resolveEnvKey('key', '', bindings, false)).toBe('exists')
      delete process.env.DYNAMIC
      expect(resolveEnvKey('key', '', bindings, false)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('returns undefined with no bindings, no autoEnv', () => {
      expect(resolveEnvKey('any.key', '', new Map(), false)).toBeUndefined()
    })

    it('returns undefined with empty bindings map and autoEnv off', () => {
      process.env.ANY_KEY = 'val'
      expect(resolveEnvKey('any.key', '', new Map(), false)).toBeUndefined()
    })

    it('handles simple key without dots', () => {
      process.env.APP_HOST = 'simple'
      expect(resolveEnvKey('host', 'APP', new Map(), true)).toBe('simple')
    })
  })
})
