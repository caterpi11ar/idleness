import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { atomicWriteFile, findConfigFile, readConfigFile } from '../io'

function makeTmpDir(): string {
  const dir = join(tmpdir(), `viper-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('findConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
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

  it('searches paths in order and returns first match', () => {
    const dir2 = `${dir}-2`
    mkdirSync(dir2, { recursive: true })
    writeFileSync(join(dir, 'app.json5'), '{ first: true }')
    writeFileSync(join(dir2, 'app.json5'), '{ second: true }')
    expect(findConfigFile('app', 'json5', [dir, dir2])).toBe(join(dir, 'app.json5'))
    rmSync(dir2, { recursive: true, force: true })
  })

  it('returns undefined for empty paths array', () => {
    expect(findConfigFile('config', 'json5', [])).toBeUndefined()
  })

  it('skips non-existent directories', () => {
    writeFileSync(join(dir, 'config.json5'), '{}')
    expect(findConfigFile('config', 'json5', ['/nonexistent/path', dir])).toBe(join(dir, 'config.json5'))
  })

  it('finds different file types', () => {
    writeFileSync(join(dir, 'settings.json'), '{}')
    expect(findConfigFile('settings', 'json', [dir])).toBe(join(dir, 'settings.json'))
  })

  it('does not find file with wrong extension', () => {
    writeFileSync(join(dir, 'config.json'), '{}')
    expect(findConfigFile('config', 'json5', [dir])).toBeUndefined()
  })

  it('does not find file with wrong name', () => {
    writeFileSync(join(dir, 'settings.json5'), '{}')
    expect(findConfigFile('config', 'json5', [dir])).toBeUndefined()
  })
})

describe('readConfigFile', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('parses JSON5 content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{ key: "value", num: 42, }')
    expect(readConfigFile(file)).toEqual({ key: 'value', num: 42 })
  })

  it('parses JSON5 with comments', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, `{
      // This is a comment
      host: "localhost",
      /* multi-line
         comment */
      port: 3000,
    }`)
    expect(readConfigFile(file)).toEqual({ host: 'localhost', port: 3000 })
  })

  it('parses JSON5 with unquoted keys and trailing commas', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{ unquoted: true, trailing: "comma", }')
    expect(readConfigFile(file)).toEqual({ unquoted: true, trailing: 'comma' })
  })

  it('parses standard JSON as well', () => {
    const file = join(dir, 'test.json')
    writeFileSync(file, '{"key": "value"}')
    expect(readConfigFile(file)).toEqual({ key: 'value' })
  })

  it('parses nested objects', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{ db: { host: "localhost", port: 5432 } }')
    expect(readConfigFile(file)).toEqual({ db: { host: 'localhost', port: 5432 } })
  })

  it('throws for non-object content (string)', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '"just a string"')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws for non-object content (number)', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '42')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws for array content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '[1, 2, 3]')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws for null content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, 'null')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws for boolean content', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, 'true')
    expect(() => readConfigFile(file)).toThrow('must contain a JSON object')
  })

  it('throws when file does not exist', () => {
    expect(() => readConfigFile(join(dir, 'nonexistent.json5'))).toThrow()
  })

  it('throws for invalid JSON5 syntax', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{ invalid syntax !!!}')
    expect(() => readConfigFile(file)).toThrow()
  })

  it('parses empty object', () => {
    const file = join(dir, 'test.json5')
    writeFileSync(file, '{}')
    expect(readConfigFile(file)).toEqual({})
  })
})

describe('atomicWriteFile', () => {
  let dir: string

  beforeEach(() => {
    dir = makeTmpDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes file atomically to new path', async () => {
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

  it('does not create backup when file is new', async () => {
    const file = join(dir, 'new.json5')
    await atomicWriteFile(file, 'content')
    expect(readFileSync(file, 'utf-8')).toBe('content')
    expect(existsSync(`${file}.bak`)).toBe(false)
  })

  it('does not leave temp files behind', async () => {
    const file = join(dir, 'clean.json5')
    await atomicWriteFile(file, 'data')
    const files = readdirSync(dir)
    const tmpFiles = files.filter(f => f.endsWith('.tmp'))
    expect(tmpFiles).toEqual([])
  })

  it('overwrites previous backup', async () => {
    const file = join(dir, 'out.json5')
    writeFileSync(file, 'v1')
    await atomicWriteFile(file, 'v2')
    expect(readFileSync(`${file}.bak`, 'utf-8')).toBe('v1')
    await atomicWriteFile(file, 'v3')
    expect(readFileSync(`${file}.bak`, 'utf-8')).toBe('v2')
    expect(readFileSync(file, 'utf-8')).toBe('v3')
  })

  it('round-trips with readConfigFile', async () => {
    const file = join(dir, 'round.json5')
    const data = '{\n  host: "localhost",\n  port: 3000,\n}\n'
    await atomicWriteFile(file, data)
    const parsed = readConfigFile(file)
    expect(parsed).toEqual({ host: 'localhost', port: 3000 })
  })

  it('can write empty content', async () => {
    const file = join(dir, 'empty.txt')
    await atomicWriteFile(file, '')
    expect(readFileSync(file, 'utf-8')).toBe('')
  })

  it('can write large content', async () => {
    const file = join(dir, 'large.json5')
    const data = '{\n'.concat(
      Array.from({ length: 1000 }, (_, i) => `  key${i}: ${i},\n`).join(''),
      '}\n',
    )
    await atomicWriteFile(file, data)
    const parsed = readConfigFile(file)
    expect(Object.keys(parsed)).toHaveLength(1000)
    expect(parsed.key0).toBe(0)
    expect(parsed.key999).toBe(999)
  })

  it('handles unicode content', async () => {
    const file = join(dir, 'unicode.json5')
    const data = '{ name: "中文测试", emoji: "🎉" }\n'
    await atomicWriteFile(file, data)
    const parsed = readConfigFile(file)
    expect(parsed.name).toBe('中文测试')
    expect(parsed.emoji).toBe('🎉')
  })
})
