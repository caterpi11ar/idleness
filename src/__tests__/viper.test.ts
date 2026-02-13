import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Viper } from '../viper'

describe('viper', () => {
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

    it('setDefaults merges multiple defaults', () => {
      const v = new Viper()
      v.setDefaults({ a: 1, b: { c: 2 } })
      v.setDefaults({ b: { d: 3 } })
      expect(v.get('a')).toBe(1)
      expect(v.get('b.c')).toBe(2)
      expect(v.get('b.d')).toBe(3)
    })
  })

  describe('case insensitivity', () => {
    it('keys are case-insensitive', () => {
      const v = new Viper()
      v.set('Database.Host', 'myhost')
      expect(v.get('database.host')).toBe('myhost')
      expect(v.get('DATABASE.HOST')).toBe('myhost')
    })
  })

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
      v.setEnvPrefix('APP')
      v.automaticEnv()

      process.env.APP_DB_HOST = 'env-host'
      expect(v.get('db.host')).toBe('env-host')
      delete process.env.APP_DB_HOST
    })
  })

  describe('typed getters', () => {
    it('getString returns empty string for missing key', () => {
      const v = new Viper()
      expect(v.getString('missing')).toBe('')
    })

    it('getNumber returns 0 for missing key', () => {
      const v = new Viper()
      expect(v.getNumber('missing')).toBe(0)
    })

    it('getNumber converts string to number', () => {
      const v = new Viper()
      v.set('port', '8080')
      expect(v.getNumber('port')).toBe(8080)
    })

    it('getBoolean handles string "true"', () => {
      const v = new Viper()
      v.set('flag', 'true')
      expect(v.getBoolean('flag')).toBe(true)
    })

    it('getBoolean handles string "1"', () => {
      const v = new Viper()
      v.set('flag', '1')
      expect(v.getBoolean('flag')).toBe(true)
    })

    it('getArray returns empty for non-array', () => {
      const v = new Viper()
      v.set('val', 'string')
      expect(v.getArray('val')).toEqual([])
    })

    it('getObject returns empty for non-object', () => {
      const v = new Viper()
      v.set('val', 42)
      expect(v.getObject('val')).toEqual({})
    })
  })

  describe('env bindings', () => {
    it('bindEnv with explicit var name', () => {
      const v = new Viper()
      v.bindEnv('host', 'MY_HOST')
      process.env.MY_HOST = 'bound-host'
      expect(v.get('host')).toBe('bound-host')
      delete process.env.MY_HOST
    })

    it('bindEnv with auto-derived name', () => {
      const v = new Viper()
      v.setEnvPrefix('APP')
      v.bindEnv('db.port')
      process.env.APP_DB_PORT = '5432'
      expect(v.get('db.port')).toBe('5432')
      delete process.env.APP_DB_PORT
    })
  })

  describe('aliases', () => {
    it('registerAlias resolves to real key', () => {
      const v = new Viper()
      v.set('database.host', 'myhost')
      v.registerAlias('db.host', 'database.host')
      expect(v.get('db.host')).toBe('myhost')
    })

    it('throws on self-alias', () => {
      const v = new Viper()
      expect(() => v.registerAlias('key', 'key')).toThrow('same')
    })
  })

  describe('introspection', () => {
    it('isSet returns true for set keys', () => {
      const v = new Viper()
      v.set('a', 1)
      expect(v.isSet('a')).toBe(true)
      expect(v.isSet('b')).toBe(false)
    })

    it('allKeys returns sorted unique keys', () => {
      const v = new Viper()
      v.setDefault('a', 1)
      v.mergeConfigMap({ b: 2 })
      v.set('c', 3)
      expect(v.allKeys()).toEqual(['a', 'b', 'c'])
    })

    it('allSettings merges all layers', () => {
      const v = new Viper()
      v.setDefault('a', 1)
      v.mergeConfigMap({ b: 2 })
      v.set('c', 3)
      expect(v.allSettings()).toEqual({ a: 1, b: 2, c: 3 })
    })
  })

  describe('config file operations', () => {
    let dir: string

    beforeEach(() => {
      dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      mkdirSync(dir, { recursive: true })
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

    it('readInConfig throws when file not found', () => {
      const v = new Viper()
      v.addConfigPath(dir)
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

    it('safeWriteConfigAs throws if file exists', async () => {
      const file = join(dir, 'existing.json5')
      writeFileSync(file, '{}')
      const v = new Viper()
      v.set('key', 'value')
      await expect(v.safeWriteConfigAs(file)).rejects.toThrow('already exists')
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
  })

  describe('zod validation', () => {
    let dir: string

    beforeEach(() => {
      dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      mkdirSync(dir, { recursive: true })
    })

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true })
    })

    it('readInConfig validates against schema', () => {
      const schema = z.object({
        host: z.string(),
        port: z.number(),
      })
      writeFileSync(join(dir, 'config.json5'), '{ host: "localhost", port: 3000 }')
      const v = new Viper({ schema })
      v.addConfigPath(dir)
      v.readInConfig()
      expect(v.get('host')).toBe('localhost')
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
  })

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
  })
})
