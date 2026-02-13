import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { atomicWriteFile, findConfigFile, readConfigFile } from '../io'

describe('findConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('finds config file in search path', () => {
    writeFileSync(join(dir, 'config.json5'), '{}')
    expect(findConfigFile('config', 'json5', [dir])).toBe(join(dir, 'config.json5'))
  })

  it('returns undefined when not found', () => {
    expect(findConfigFile('config', 'json5', [dir])).toBeUndefined()
  })

  it('searches paths in order', () => {
    const dir2 = `${dir}-2`
    mkdirSync(dir2, { recursive: true })
    writeFileSync(join(dir, 'app.json5'), '{ first: true }')
    writeFileSync(join(dir2, 'app.json5'), '{ second: true }')
    expect(findConfigFile('app', 'json5', [dir, dir2])).toBe(join(dir, 'app.json5'))
    rmSync(dir2, { recursive: true, force: true })
  })
})

describe('readConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('parses JSON5 content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{ key: "value", num: 42, }')
    expect(readConfigFile(file)).toEqual({ key: 'value', num: 42 })
  })

  it('throws for non-object content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '"just a string"')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws for array content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '[1, 2, 3]')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })
})

describe('atomicWriteFile', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes file atomically', async () => {
    const file = join(dir, 'out.json5')
    await atomicWriteFile(file, '{ test: true }\n')
    expect(readFileSync(file, 'utf-8')).toBe('{ test: true }\n')
  })

  it('creates backup of existing file', async () => {
    const file = join(dir, 'out.json5')
    writeFileSync(file, 'old content')
    await atomicWriteFile(file, 'new content')
    expect(readFileSync(file, 'utf-8')).toBe('new content')
    expect(existsSync(`${file}.bak`)).toBe(true)
    expect(readFileSync(`${file}.bak`, 'utf-8')).toBe('old content')
  })

  it('round-trips with readConfigFile', async () => {
    const file = join(dir, 'round.json5')
    const data = '{\n  host: "localhost",\n  port: 3000,\n}\n'
    await atomicWriteFile(file, data)
    const parsed = readConfigFile(file)
    expect(parsed).toEqual({ host: 'localhost', port: 3000 })
  })
})
