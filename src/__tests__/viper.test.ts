import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createViper } from '../index'
import { Viper } from '../viper'

function makeTmpDir(): string {
  const dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// ─── createViper factory ─────────────────────────────────────────────

describe('createViper', () => {
  it('creates a Viper instance', () => {
    const v = createViper()
    expect(v).toBeInstanceOf(Viper)
  })

  it('creates a Viper instance with schema', () => {
    const schema = z.object({ host: z.string() })
    const v = createViper({ schema })
    expect(v).toBeInstanceOf(Viper)
  })

  it('creates a Viper instance with custom keyDelimiter', () => {
    const v = createViper({ keyDelimiter: '/' })
    v.set('a/b', 'val')
    expect(v.get('a/b')).toBe('val')
  })
})

// ─── Constructor ─────────────────────────────────────────────────────

describe('constructor', () => {
  it('works with no arguments', () => {
    const v = new Viper()
    expect(v.get('anything')).toBeUndefined()
  })

  it('accepts custom keyDelimiter', () => {
    const v = new Viper({ keyDelimiter: '/' })
    v.setDefault('a/b/c', 'val')
    expect(v.get('a/b/c')).toBe('val')
  })

  it('uses dot as default delimiter', () => {
    const v = new Viper()
    v.setDefault('a.b', 'val')
    expect(v.get('a.b')).toBe('val')
  })
})

// ─── Defaults ────────────────────────────────────────────────────────

describe('defaults', () => {
  it('returns default values', () => {
    const v = new Viper()
    v.setDefault('host', 'localhost')
    v.setDefault('port', 3000)
    expect(v.get('host')).toBe('localhost')
    expect(v.get('port')).toBe(3000)
  })

  it('supports nested defaults via dot-notation', () => {
    const v = new Viper()
    v.setDefault('database.host', 'localhost')
    expect(v.get('database.host')).toBe('localhost')
    expect(v.getObject('database')).toEqual({ host: 'localhost' })
  })

  it('setDefault overwrites existing default', () => {
    const v = new Viper()
    v.setDefault('key', 'first')
    v.setDefault('key', 'second')
    expect(v.get('key')).toBe('second')
  })

  it('setDefaults merges multiple defaults', () => {
    const v = new Viper()
    v.setDefaults({ a: 1, b: { c: 2 } })
    v.setDefaults({ b: { d: 3 } })
    expect(v.get('a')).toBe(1)
    expect(v.get('b.c')).toBe(2)
    expect(v.get('b.d')).toBe(3)
  })

  it('setDefaults lowercases keys', () => {
    const v = new Viper()
    v.setDefaults({ HOST: 'localhost', Database: { PORT: 5432 } })
    expect(v.get('host')).toBe('localhost')
    expect(v.get('database.port')).toBe(5432)
  })

  it('setDefault with array value', () => {
    const v = new Viper()
    v.setDefault('tags', ['a', 'b'])
    expect(v.getArray('tags')).toEqual(['a', 'b'])
  })

  it('setDefault with boolean value', () => {
    const v = new Viper()
    v.setDefault('debug', false)
    expect(v.get('debug')).toBe(false)
    expect(v.getBoolean('debug')).toBe(false)
  })
})

// ─── Case insensitivity ──────────────────────────────────────────────

describe('case insensitivity', () => {
  it('keys are case-insensitive for set/get', () => {
    const v = new Viper()
    v.set('Database.Host', 'myhost')
    expect(v.get('database.host')).toBe('myhost')
    expect(v.get('DATABASE.HOST')).toBe('myhost')
    expect(v.get('Database.Host')).toBe('myhost')
  })

  it('keys are case-insensitive for setDefault', () => {
    const v = new Viper()
    v.setDefault('DB.HOST', 'localhost')
    expect(v.get('db.host')).toBe('localhost')
  })

  it('keys are case-insensitive for mergeConfigMap', () => {
    const v = new Viper()
    v.mergeConfigMap({ HOST: 'myhost' })
    expect(v.get('host')).toBe('myhost')
  })

  it('keys are case-insensitive for isSet', () => {
    const v = new Viper()
    v.set('MyKey', 'val')
    expect(v.isSet('mykey')).toBe(true)
    expect(v.isSet('MYKEY')).toBe(true)
  })
})

// ─── Layered precedence ──────────────────────────────────────────────

describe('layered precedence', () => {
  it('override > config > defaults', () => {
    const v = new Viper()
    v.setDefault('key', 'default')
    expect(v.get('key')).toBe('default')

    v.mergeConfigMap({ key: 'from-config' })
    expect(v.get('key')).toBe('from-config')

    v.set('key', 'override')
    expect(v.get('key')).toBe('override')
  })

  it('env overrides config and defaults', () => {
    const v = new Viper()
    v.setDefault('db.host', 'default-host')
    v.mergeConfigMap({ db: { host: 'config-host' } })
    v.setEnvPrefix('APP')
    v.automaticEnv()

    process.env.APP_DB_HOST = 'env-host'
    expect(v.get('db.host')).toBe('env-host')
    delete process.env.APP_DB_HOST
  })

  it('override > env > config > defaults (full 4-layer)', () => {
    const v = new Viper()
    v.setDefault('port', 3000)
    v.mergeConfigMap({ port: 8080 })
    v.setEnvPrefix('TEST')
    v.automaticEnv()
    process.env.TEST_PORT = '9090'

    // env wins over config & default
    expect(v.get('port')).toBe('9090')

    // override wins over env
    v.set('port', 4000)
    expect(v.get('port')).toBe(4000)

    delete process.env.TEST_PORT
  })

  it('returns undefined when key is not in any layer', () => {
    const v = new Viper()
    expect(v.get('nonexistent')).toBeUndefined()
  })

  it('config does not affect defaults layer', () => {
    const v = new Viper()
    v.setDefault('a', 'default-a')
    v.setDefault('b', 'default-b')
    v.mergeConfigMap({ a: 'config-a' })
    expect(v.get('a')).toBe('config-a')
    expect(v.get('b')).toBe('default-b')
  })
})

// ─── Typed getters ───────────────────────────────────────────────────

describe('typed getters', () => {
  describe('getString', () => {
    it('returns empty string for missing key', () => {
      expect(new Viper().getString('missing')).toBe('')
    })

    it('converts number to string', () => {
      const v = new Viper()
      v.set('port', 3000)
      expect(v.getString('port')).toBe('3000')
    })

    it('converts boolean to string', () => {
      const v = new Viper()
      v.set('flag', true)
      expect(v.getString('flag')).toBe('true')
    })

    it('returns string value as-is', () => {
      const v = new Viper()
      v.set('host', 'localhost')
      expect(v.getString('host')).toBe('localhost')
    })
  })

  describe('getNumber', () => {
    it('returns 0 for missing key', () => {
      expect(new Viper().getNumber('missing')).toBe(0)
    })

    it('converts string to number', () => {
      const v = new Viper()
      v.set('port', '8080')
      expect(v.getNumber('port')).toBe(8080)
    })

    it('returns 0 for non-numeric string', () => {
      const v = new Viper()
      v.set('port', 'abc')
      expect(v.getNumber('port')).toBe(0)
    })

    it('returns number value as-is', () => {
      const v = new Viper()
      v.set('port', 3000)
      expect(v.getNumber('port')).toBe(3000)
    })

    it('handles float values', () => {
      const v = new Viper()
      v.set('rate', 1.5)
      expect(v.getNumber('rate')).toBe(1.5)
    })

    it('handles negative numbers', () => {
      const v = new Viper()
      v.set('offset', -10)
      expect(v.getNumber('offset')).toBe(-10)
    })

    it('returns 0 for NaN', () => {
      const v = new Viper()
      v.set('val', Number.NaN)
      expect(v.getNumber('val')).toBe(0)
    })
  })

  describe('getBoolean', () => {
    it('returns false for missing key', () => {
      expect(new Viper().getBoolean('missing')).toBe(false)
    })

    it('returns true for boolean true', () => {
      const v = new Viper()
      v.set('flag', true)
      expect(v.getBoolean('flag')).toBe(true)
    })

    it('returns false for boolean false', () => {
      const v = new Viper()
      v.set('flag', false)
      expect(v.getBoolean('flag')).toBe(false)
    })

    it('handles string "true" (case-insensitive)', () => {
      const v = new Viper()
      v.set('flag', 'true')
      expect(v.getBoolean('flag')).toBe(true)

      v.set('flag2', 'TRUE')
      expect(v.getBoolean('flag2')).toBe(true)

      v.set('flag3', 'True')
      expect(v.getBoolean('flag3')).toBe(true)
    })

    it('handles string "1"', () => {
      const v = new Viper()
      v.set('flag', '1')
      expect(v.getBoolean('flag')).toBe(true)
    })

    it('returns false for string "false"', () => {
      const v = new Viper()
      v.set('flag', 'false')
      expect(v.getBoolean('flag')).toBe(false)
    })

    it('returns false for string "0"', () => {
      const v = new Viper()
      v.set('flag', '0')
      expect(v.getBoolean('flag')).toBe(false)
    })

    it('uses Boolean() for non-string non-boolean values', () => {
      const v = new Viper()
      v.set('a', 1)
      expect(v.getBoolean('a')).toBe(true)
      v.set('b', 0)
      expect(v.getBoolean('b')).toBe(false)
    })
  })

  describe('getArray', () => {
    it('returns empty array for non-array value', () => {
      const v = new Viper()
      v.set('val', 'string')
      expect(v.getArray('val')).toEqual([])
    })

    it('returns empty array for missing key', () => {
      expect(new Viper().getArray('missing')).toEqual([])
    })

    it('returns array value', () => {
      const v = new Viper()
      v.set('list', [1, 2, 3])
      expect(v.getArray('list')).toEqual([1, 2, 3])
    })

    it('returns array of mixed types', () => {
      const v = new Viper()
      v.set('list', [1, 'two', true, null])
      expect(v.getArray('list')).toEqual([1, 'two', true, null])
    })

    it('returns empty array for object value', () => {
      const v = new Viper()
      v.set('val', { a: 1 })
      expect(v.getArray('val')).toEqual([])
    })
  })

  describe('getObject', () => {
    it('returns empty object for non-object value', () => {
      const v = new Viper()
      v.set('val', 42)
      expect(v.getObject('val')).toEqual({})
    })

    it('returns empty object for missing key', () => {
      expect(new Viper().getObject('missing')).toEqual({})
    })

    it('returns object value', () => {
      const v = new Viper()
      v.mergeConfigMap({ db: { host: 'localhost', port: 5432 } })
      expect(v.getObject('db')).toEqual({ host: 'localhost', port: 5432 })
    })

    it('returns empty object for null value', () => {
      const v = new Viper()
      v.set('val', null)
      expect(v.getObject('val')).toEqual({})
    })

    it('returns empty object for array value', () => {
      const v = new Viper()
      v.set('val', [1, 2])
      expect(v.getObject('val')).toEqual({})
    })

    it('returns empty object for string value', () => {
      const v = new Viper()
      v.set('val', 'str')
      expect(v.getObject('val')).toEqual({})
    })
  })
})

// ─── Environment variable bindings ───────────────────────────────────

describe('env bindings', () => {
  afterEach(() => {
    delete process.env.MY_HOST
    delete process.env.APP_DB_PORT
    delete process.env.MULTI_A
    delete process.env.MULTI_B
    delete process.env.APP_HOST
    delete process.env.HOST
    delete process.env.APP_DB_HOST
    delete process.env.TEST_ENVBIND_KEY
  })

  it('bindEnv with explicit var name', () => {
    const v = new Viper()
    v.bindEnv('host', 'MY_HOST')
    process.env.MY_HOST = 'bound-host'
    expect(v.get('host')).toBe('bound-host')
  })

  it('bindEnv with auto-derived name (with prefix)', () => {
    const v = new Viper()
    v.setEnvPrefix('APP')
    v.bindEnv('db.port')
    process.env.APP_DB_PORT = '5432'
    expect(v.get('db.port')).toBe('5432')
  })

  it('bindEnv with auto-derived name (without prefix)', () => {
    const v = new Viper()
    v.bindEnv('host')
    process.env.HOST = 'no-prefix-host'
    expect(v.get('host')).toBe('no-prefix-host')
  })

  it('bindEnv accumulates multiple calls', () => {
    const v = new Viper()
    v.bindEnv('key', 'MULTI_A')
    v.bindEnv('key', 'MULTI_B')
    process.env.MULTI_B = 'from-b'
    expect(v.get('key')).toBe('from-b')

    process.env.MULTI_A = 'from-a'
    // MULTI_A was added first, so it should be checked first
    expect(v.get('key')).toBe('from-a')
  })

  it('setEnvPrefix uppercases the prefix', () => {
    const v = new Viper()
    v.setEnvPrefix('app')
    v.automaticEnv()
    process.env.APP_HOST = 'upper-host'
    expect(v.get('host')).toBe('upper-host')
  })

  it('bindEnv is case-insensitive for key', () => {
    const v = new Viper()
    v.bindEnv('DB.Host', 'APP_DB_HOST')
    process.env.APP_DB_HOST = 'ci-host'
    expect(v.get('db.host')).toBe('ci-host')
  })
})

// ─── Aliases ─────────────────────────────────────────────────────────

describe('aliases', () => {
  it('registerAlias resolves to real key', () => {
    const v = new Viper()
    v.set('database.host', 'myhost')
    v.registerAlias('db.host', 'database.host')
    expect(v.get('db.host')).toBe('myhost')
  })

  it('alias is case-insensitive', () => {
    const v = new Viper()
    v.set('database.host', 'myhost')
    v.registerAlias('DB.HOST', 'database.host')
    expect(v.get('db.host')).toBe('myhost')
  })

  it('alias chain resolves (A -> B -> C)', () => {
    const v = new Viper()
    v.set('real.key', 'value')
    v.registerAlias('middle', 'real.key')
    v.registerAlias('shortcut', 'middle')
    expect(v.get('shortcut')).toBe('value')
  })

  it('throws on self-alias', () => {
    const v = new Viper()
    expect(() => v.registerAlias('key', 'key')).toThrow('same')
  })

  it('throws on self-alias (case-insensitive)', () => {
    const v = new Viper()
    expect(() => v.registerAlias('KEY', 'key')).toThrow('same')
  })

  it('throws on circular alias', () => {
    const v = new Viper()
    v.registerAlias('a', 'b')
    v.registerAlias('b', 'a')
    expect(() => v.get('a')).toThrow('circular alias')
  })

  it('alias works across all layers', () => {
    const v = new Viper()
    v.setDefault('database.host', 'default-host')
    v.registerAlias('db.host', 'database.host')
    expect(v.get('db.host')).toBe('default-host')

    v.mergeConfigMap({ database: { host: 'config-host' } })
    expect(v.get('db.host')).toBe('config-host')

    v.set('database.host', 'override-host')
    expect(v.get('db.host')).toBe('override-host')
  })

  it('isSet works through alias', () => {
    const v = new Viper()
    v.set('real', 'val')
    v.registerAlias('alias', 'real')
    expect(v.isSet('alias')).toBe(true)
  })
})

// ─── Introspection ───────────────────────────────────────────────────

describe('introspection', () => {
  it('isSet returns true for set keys', () => {
    const v = new Viper()
    v.set('a', 1)
    expect(v.isSet('a')).toBe(true)
    expect(v.isSet('b')).toBe(false)
  })

  it('isSet works for defaults', () => {
    const v = new Viper()
    v.setDefault('key', 'val')
    expect(v.isSet('key')).toBe(true)
  })

  it('isSet works for config', () => {
    const v = new Viper()
    v.mergeConfigMap({ key: 'val' })
    expect(v.isSet('key')).toBe(true)
  })

  it('isSet works for env-bound keys', () => {
    const v = new Viper()
    v.bindEnv('key', 'TEST_ISSET_ENV')
    process.env.TEST_ISSET_ENV = 'val'
    expect(v.isSet('key')).toBe(true)
    delete process.env.TEST_ISSET_ENV
  })

  it('allKeys returns sorted unique keys from all layers', () => {
    const v = new Viper()
    v.setDefault('c', 3)
    v.setDefault('a', 1)
    v.mergeConfigMap({ b: 2, a: 10 })
    v.set('d', 4)
    expect(v.allKeys()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('allKeys includes nested keys', () => {
    const v = new Viper()
    v.setDefaults({ db: { host: 'localhost', port: 5432 } })
    expect(v.allKeys()).toEqual(['db.host', 'db.port'])
  })

  it('allKeys deduplicates across layers', () => {
    const v = new Viper()
    v.setDefault('key', 'default')
    v.mergeConfigMap({ key: 'config' })
    v.set('key', 'override')
    expect(v.allKeys()).toEqual(['key'])
  })

  it('allKeys returns empty array when no keys', () => {
    expect(new Viper().allKeys()).toEqual([])
  })

  it('allSettings merges all layers', () => {
    const v = new Viper()
    v.setDefault('a', 1)
    v.mergeConfigMap({ b: 2 })
    v.set('c', 3)
    expect(v.allSettings()).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('allSettings respects override precedence', () => {
    const v = new Viper()
    v.setDefault('key', 'default')
    v.mergeConfigMap({ key: 'config' })
    v.set('key', 'override')
    expect(v.allSettings()).toEqual({ key: 'override' })
  })

  it('allSettings merges nested objects', () => {
    const v = new Viper()
    v.setDefaults({ db: { host: 'localhost' } })
    v.mergeConfigMap({ db: { port: 5432 } })
    v.set('db.name', 'mydb')
    expect(v.allSettings()).toEqual({ db: { host: 'localhost', port: 5432, name: 'mydb' } })
  })

  it('allSettings applies env overrides', () => {
    const v = new Viper()
    v.setDefault('host', 'localhost')
    v.setEnvPrefix('TEST')
    v.automaticEnv()
    process.env.TEST_HOST = 'env-host'
    const settings = v.allSettings()
    expect(settings.host).toBe('env-host')
    delete process.env.TEST_HOST
  })

  it('allSettings returns empty object when empty', () => {
    expect(new Viper().allSettings()).toEqual({})
  })
})

// ─── Config file operations ──────────────────────────────────────────

describe('config file operations', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('readInConfig reads and parses file', () => {
    writeFileSync(join(dir, 'config.json5'), '{ host: "localhost", port: 3000 }')
    const v = new Viper()
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('host')).toBe('localhost')
    expect(v.get('port')).toBe(3000)
    expect(v.configFileUsed()).toBe(join(dir, 'config.json5'))
  })

  it('readInConfig with setConfigFile (explicit path)', () => {
    const file = join(dir, 'custom.json5')
    writeFileSync(file, '{ key: "value" }')
    const v = new Viper()
    v.setConfigFile(file)
    v.readInConfig()
    expect(v.get('key')).toBe('value')
  })

  it('readInConfig lowercases keys from file', () => {
    writeFileSync(join(dir, 'config.json5'), '{ HOST: "myhost", Database: { Port: 5432 } }')
    const v = new Viper()
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('host')).toBe('myhost')
    expect(v.get('database.port')).toBe(5432)
  })

  it('readInConfig replaces existing config', () => {
    writeFileSync(join(dir, 'config.json5'), '{ a: 1 }')
    const v = new Viper()
    v.mergeConfigMap({ b: 2 })
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('a')).toBe(1)
    expect(v.get('b')).toBeUndefined()
  })

  it('readInConfig throws when file not found', () => {
    const v = new Viper()
    v.addConfigPath(dir)
    expect(() => v.readInConfig()).toThrow('config file not found')
  })

  it('readInConfig throws when no paths configured', () => {
    const v = new Viper()
    expect(() => v.readInConfig()).toThrow('config file not found')
  })

  it('mergeInConfig merges into existing config', () => {
    writeFileSync(join(dir, 'config.json5'), '{ b: 2 }')
    const v = new Viper()
    v.mergeConfigMap({ a: 1 })
    v.addConfigPath(dir)
    v.mergeInConfig()
    expect(v.get('a')).toBe(1)
    expect(v.get('b')).toBe(2)
  })

  it('mergeInConfig throws when file not found', () => {
    const v = new Viper()
    v.addConfigPath(dir)
    expect(() => v.mergeInConfig()).toThrow('config file not found')
  })

  it('mergeInConfig overwrites existing keys', () => {
    writeFileSync(join(dir, 'config.json5'), '{ key: "from-file" }')
    const v = new Viper()
    v.mergeConfigMap({ key: 'original' })
    v.addConfigPath(dir)
    v.mergeInConfig()
    expect(v.get('key')).toBe('from-file')
  })

  it('mergeConfigMap lowercases keys', () => {
    const v = new Viper()
    v.mergeConfigMap({ HOST: 'myhost', Database: { Port: 5432 } })
    expect(v.get('host')).toBe('myhost')
    expect(v.get('database.port')).toBe(5432)
  })

  it('configFileUsed returns undefined when no file', () => {
    const v = new Viper()
    expect(v.configFileUsed()).toBeUndefined()
  })

  it('setConfigName and setConfigType customize search', () => {
    writeFileSync(join(dir, 'app.json'), '{ name: "myapp" }')
    const v = new Viper()
    v.setConfigName('app')
    v.setConfigType('json')
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('name')).toBe('myapp')
  })

  it('addConfigPath searches multiple directories', () => {
    const dir2 = `${dir}-2`
    mkdirSync(dir2, { recursive: true })
    writeFileSync(join(dir2, 'config.json5'), '{ source: "dir2" }')
    const v = new Viper()
    v.addConfigPath(dir)
    v.addConfigPath(dir2)
    v.readInConfig()
    expect(v.get('source')).toBe('dir2')
    rmSync(dir2, { recursive: true, force: true })
  })
})

// ─── Write operations ────────────────────────────────────────────────

describe('write operations', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writeConfig writes current settings', async () => {
    const file = join(dir, 'config.json5')
    writeFileSync(file, '{}')
    const v = new Viper()
    v.setConfigFile(file)
    v.readInConfig()
    v.set('host', 'localhost')
    await v.writeConfig()
    const v2 = new Viper()
    v2.setConfigFile(file)
    v2.readInConfig()
    expect(v2.get('host')).toBe('localhost')
  })

  it('writeConfig throws when no config file set', async () => {
    const v = new Viper()
    v.set('key', 'value')
    await expect(v.writeConfig()).rejects.toThrow('no config file set')
  })

  it('writeConfigAs writes to specific path', async () => {
    const file = join(dir, 'output.json5')
    const v = new Viper()
    v.set('key', 'value')
    await v.writeConfigAs(file)
    const v2 = new Viper()
    v2.setConfigFile(file)
    v2.readInConfig()
    expect(v2.get('key')).toBe('value')
  })

  it('writeConfigAs writes all layers merged', async () => {
    const file = join(dir, 'output.json5')
    const v = new Viper()
    v.setDefault('a', 1)
    v.mergeConfigMap({ b: 2 })
    v.set('c', 3)
    await v.writeConfigAs(file)
    const v2 = new Viper()
    v2.setConfigFile(file)
    v2.readInConfig()
    expect(v2.get('a')).toBe(1)
    expect(v2.get('b')).toBe(2)
    expect(v2.get('c')).toBe(3)
  })

  it('safeWriteConfig throws when no config file set', async () => {
    const v = new Viper()
    await expect(v.safeWriteConfig()).rejects.toThrow('no config file set')
  })

  it('safeWriteConfig writes when file does not exist', async () => {
    const file = join(dir, 'safe.json5')
    const v = new Viper()
    v.setConfigFile(file)
    v.set('key', 'safe-value')
    await v.safeWriteConfig()
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf-8')).toContain('safe-value')
  })

  it('safeWriteConfig throws when file already exists', async () => {
    const file = join(dir, 'existing.json5')
    writeFileSync(file, '{}')
    const v = new Viper()
    v.setConfigFile(file)
    v.set('key', 'value')
    await expect(v.safeWriteConfig()).rejects.toThrow('already exists')
  })

  it('safeWriteConfigAs writes when file does not exist', async () => {
    const file = join(dir, 'safe-as.json5')
    const v = new Viper()
    v.set('key', 'value')
    await v.safeWriteConfigAs(file)
    expect(existsSync(file)).toBe(true)
  })

  it('safeWriteConfigAs throws if file exists', async () => {
    const file = join(dir, 'existing.json5')
    writeFileSync(file, '{}')
    const v = new Viper()
    v.set('key', 'value')
    await expect(v.safeWriteConfigAs(file)).rejects.toThrow('already exists')
  })

  it('writeConfig round-trips config correctly', async () => {
    const file = join(dir, 'roundtrip.json5')
    const v = new Viper()
    v.setConfigFile(file)
    v.setDefaults({
      host: 'localhost',
      port: 3000,
      database: { host: 'db.example.com', port: 5432 },
      tags: ['web', 'api'],
    })
    v.set('port', 8080)
    await v.writeConfig()

    const v2 = new Viper()
    v2.setConfigFile(file)
    v2.readInConfig()
    expect(v2.get('host')).toBe('localhost')
    expect(v2.get('port')).toBe(8080)
    expect(v2.get('database.host')).toBe('db.example.com')
    expect(v2.getArray('tags')).toEqual(['web', 'api'])
  })
})

// ─── Zod validation ──────────────────────────────────────────────────

describe('zod validation', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('readInConfig validates against schema (valid)', () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
    })
    writeFileSync(join(dir, 'config.json5'), '{ host: "localhost", port: 3000 }')
    const v = new Viper({ schema })
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('host')).toBe('localhost')
    expect(v.get('port')).toBe(3000)
  })

  it('readInConfig throws ZodError for invalid config', () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
    })
    writeFileSync(join(dir, 'config.json5'), '{ host: 123 }')
    const v = new Viper({ schema })
    v.addConfigPath(dir)
    expect(() => v.readInConfig()).toThrow()
  })

  it('mergeInConfig validates merged result against schema', () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
    })
    const v = new Viper({ schema })
    v.mergeConfigMap({ host: 'localhost' })
    writeFileSync(join(dir, 'config.json5'), '{ port: 3000 }')
    v.addConfigPath(dir)
    // Merged result { host: "localhost", port: 3000 } should pass
    v.mergeInConfig()
    expect(v.get('host')).toBe('localhost')
    expect(v.get('port')).toBe(3000)
  })

  it('mergeInConfig throws when merged result is invalid', () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
    })
    const v = new Viper({ schema })
    v.mergeConfigMap({ host: 123 }) // wrong type
    writeFileSync(join(dir, 'config.json5'), '{ port: 3000 }')
    v.addConfigPath(dir)
    expect(() => v.mergeInConfig()).toThrow()
  })

  it('writeConfig validates before writing', async () => {
    const schema = z.object({
      host: z.string(),
      port: z.number(),
    })
    const file = join(dir, 'out.json5')
    const v = new Viper({ schema })
    v.setConfigFile(file)
    v.set('host', 123) // wrong type
    await expect(v.writeConfig()).rejects.toThrow()
  })

  it('writeConfigAs validates before writing', async () => {
    const schema = z.object({ port: z.number() })
    const file = join(dir, 'out.json5')
    const v = new Viper({ schema })
    v.set('port', 'not-a-number')
    await expect(v.writeConfigAs(file)).rejects.toThrow()
    expect(existsSync(file)).toBe(false)
  })

  it('schema does not affect mergeConfigMap (no validation on merge)', () => {
    const schema = z.object({ host: z.string() })
    const v = new Viper({ schema })
    // mergeConfigMap does not validate
    v.mergeConfigMap({ host: 123 })
    expect(v.get('host')).toBe(123)
  })

  it('works without schema (no validation)', () => {
    writeFileSync(join(dir, 'config.json5'), '{ anything: "goes", num: 42 }')
    const v = new Viper()
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('anything')).toBe('goes')
    expect(v.get('num')).toBe(42)
  })

  it('nested schema validation', () => {
    const schema = z.object({
      db: z.object({
        host: z.string(),
        port: z.number().int().min(1).max(65535),
      }),
    })
    writeFileSync(join(dir, 'config.json5'), '{ db: { host: "localhost", port: 5432 } }')
    const v = new Viper({ schema })
    v.addConfigPath(dir)
    v.readInConfig()
    expect(v.get('db.host')).toBe('localhost')
    expect(v.get('db.port')).toBe(5432)
  })
})

// ─── Sub-tree ────────────────────────────────────────────────────────

describe('sub', () => {
  it('returns a sub-viper for nested key', () => {
    const v = new Viper()
    v.mergeConfigMap({ database: { host: 'localhost', port: 5432 } })
    const sub = v.sub('database')
    expect(sub).toBeDefined()
    expect(sub!.get('host')).toBe('localhost')
    expect(sub!.get('port')).toBe(5432)
  })

  it('returns undefined for non-object key', () => {
    const v = new Viper()
    v.set('key', 'string')
    expect(v.sub('key')).toBeUndefined()
  })

  it('returns undefined for missing key', () => {
    const v = new Viper()
    expect(v.sub('nonexistent')).toBeUndefined()
  })

  it('returns undefined for array key', () => {
    const v = new Viper()
    v.set('list', [1, 2, 3])
    expect(v.sub('list')).toBeUndefined()
  })

  it('returns undefined for null key', () => {
    const v = new Viper()
    v.set('key', null)
    expect(v.sub('key')).toBeUndefined()
  })

  it('sub-viper keys are lowercased', () => {
    const v = new Viper()
    v.mergeConfigMap({ section: { KEY: 'value' } })
    const sub = v.sub('section')
    expect(sub).toBeDefined()
    expect(sub!.get('key')).toBe('value')
  })

  it('sub-viper is independent from parent', () => {
    const v = new Viper()
    v.mergeConfigMap({ section: { a: 1 } })
    const sub = v.sub('section')!
    sub.set('b', 2)
    // Parent should not be affected
    expect(v.get('section.b')).toBeUndefined()
  })

  it('deeply nested sub', () => {
    const v = new Viper()
    v.mergeConfigMap({ a: { b: { c: 'deep' } } })
    const sub = v.sub('a')
    expect(sub).toBeDefined()
    expect(sub!.get('b.c')).toBe('deep')
  })

  it('sub-viper supports all getters', () => {
    const v = new Viper()
    v.mergeConfigMap({
      section: {
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2],
        obj: { key: 'val' },
      },
    })
    const sub = v.sub('section')!
    expect(sub.getString('str')).toBe('hello')
    expect(sub.getNumber('num')).toBe(42)
    expect(sub.getBoolean('bool')).toBe(true)
    expect(sub.getArray('arr')).toEqual([1, 2])
    expect(sub.getObject('obj')).toEqual({ key: 'val' })
  })
})

// ─── Custom key delimiter ────────────────────────────────────────────

describe('custom key delimiter', () => {
  it('uses / as delimiter', () => {
    const v = new Viper({ keyDelimiter: '/' })
    v.setDefault('a/b/c', 'val')
    expect(v.get('a/b/c')).toBe('val')
    expect(v.getObject('a')).toEqual({ b: { c: 'val' } })
  })

  it('uses : as delimiter', () => {
    const v = new Viper({ keyDelimiter: ':' })
    v.set('db:host', 'localhost')
    expect(v.get('db:host')).toBe('localhost')
  })

  it('dot in key is literal with non-dot delimiter', () => {
    const v = new Viper({ keyDelimiter: '/' })
    v.set('a.b', 'dotted')
    expect(v.get('a.b')).toBe('dotted')
    // Not nested via dot
    expect(v.get('a')).toBeUndefined()
  })
})

// ─── Integration tests ──────────────────────────────────────────────

describe('integration', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    delete process.env.INTEG_HOST
    delete process.env.INTEG_DB_PORT
  })

  it('full workflow: defaults + file + env + override', () => {
    // Set up config file
    writeFileSync(join(dir, 'config.json5'), `{
      host: "file-host",
      port: 8080,
      database: {
        host: "db.example.com",
        port: 5432,
      },
    }`)

    const v = new Viper()

    // 1. Defaults
    v.setDefaults({
      host: 'localhost',
      port: 3000,
      database: { host: 'localhost', port: 5432, name: 'mydb' },
      debug: false,
    })

    // 2. Config file
    v.addConfigPath(dir)
    v.readInConfig()

    // 3. Env
    v.setEnvPrefix('INTEG')
    v.automaticEnv()
    process.env.INTEG_HOST = 'env-host'

    // 4. Override
    v.set('debug', true)

    // Check precedence
    expect(v.get('host')).toBe('env-host') // env > file > default
    expect(v.getNumber('port')).toBe(8080) // file > default
    expect(v.get('database.host')).toBe('db.example.com') // file > default
    expect(v.get('database.name')).toBe('mydb') // default (not in file)
    expect(v.getBoolean('debug')).toBe(true) // override > default
  })

  it('allSettings with env vars reflects in output', () => {
    const v = new Viper()
    v.setDefaults({ host: 'localhost', port: 3000 })
    v.setEnvPrefix('INTEG')
    v.automaticEnv()
    process.env.INTEG_HOST = 'env-host'

    const settings = v.allSettings()
    expect(settings).toEqual({ host: 'env-host', port: 3000 })
  })

  it('config file with complex JSON5 features', () => {
    writeFileSync(join(dir, 'config.json5'), `{
      // Server config
      host: "0.0.0.0",
      port: 8080,

      /* Database settings */
      database: {
        host: "db.example.com",
        port: 5432,
        ssl: true,
      },

      // Feature flags
      features: ["auth", "logging"],
    }`)

    const v = new Viper()
    v.addConfigPath(dir)
    v.readInConfig()

    expect(v.getString('host')).toBe('0.0.0.0')
    expect(v.getNumber('port')).toBe(8080)
    expect(v.get('database.host')).toBe('db.example.com')
    expect(v.getBoolean('database.ssl')).toBe(true)
    expect(v.getArray('features')).toEqual(['auth', 'logging'])
  })

  it('write then read preserves all data', async () => {
    const v = new Viper()
    v.setDefaults({
      server: { host: 'localhost', port: 3000 },
      database: { url: 'postgres://localhost/db' },
      debug: false,
    })
    v.set('server.port', 8080)
    v.set('debug', true)

    const file = join(dir, 'output.json5')
    await v.writeConfigAs(file)

    const v2 = new Viper()
    v2.setConfigFile(file)
    v2.readInConfig()
    expect(v2.get('server.host')).toBe('localhost')
    expect(v2.get('server.port')).toBe(8080)
    expect(v2.get('database.url')).toBe('postgres://localhost/db')
    expect(v2.get('debug')).toBe(true)
  })
})
