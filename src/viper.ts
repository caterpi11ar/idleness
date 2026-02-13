import type { ZodType } from 'zod'
import type { ViperOptions } from './types'
import json5 from 'json5'
import { resolveEnvKey } from './env'
import { atomicWriteFile, findConfigFile, readConfigFile } from './io'
import { deepGet, deepSet, flattenKeys, splitKey } from './keys'
import { deepMerge } from './merge'

function lowercaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const lk = key.toLowerCase()
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[lk] = lowercaseKeys(val as Record<string, unknown>)
    }
    else {
      result[lk] = val
    }
  }
  return result
}

export class Viper<TSchema extends ZodType = ZodType> {
  private defaults: Record<string, unknown> = {}
  private config: Record<string, unknown> = {}
  private overrides: Record<string, unknown> = {}
  private envBindings: Map<string, string[]> = new Map()
  private aliases: Map<string, string> = new Map()

  private schema?: TSchema
  private keyDelim: string
  private envPrefix: string = ''
  private autoEnv: boolean = false

  private configFilePath?: string
  private configName: string = 'config'
  private configType: string = 'json5'
  private configPaths: string[] = []

  constructor(options?: ViperOptions<TSchema>) {
    this.schema = options?.schema
    this.keyDelim = options?.keyDelimiter ?? '.'
  }

  // --- Defaults ---

  setDefault(key: string, value: unknown): void {
    const path = splitKey(key, this.keyDelim)
    deepSet(this.defaults, path, value)
  }

  setDefaults(defaults: Record<string, unknown>): void {
    this.defaults = deepMerge(this.defaults, lowercaseKeys(defaults))
  }

  // --- Config file operations ---

  setConfigFile(path: string): void {
    this.configFilePath = path
  }

  setConfigName(name: string): void {
    this.configName = name
  }

  setConfigType(type: string): void {
    this.configType = type
  }

  addConfigPath(path: string): void {
    this.configPaths.push(path)
  }

  configFileUsed(): string | undefined {
    return this.configFilePath
  }

  readInConfig(): void {
    const file = this.resolveConfigFile()
    if (!file) {
      throw new Error(
        `config file not found: searched for "${this.configName}.${this.configType}" in [${this.configPaths.join(', ')}]`,
      )
    }
    this.configFilePath = file
    const parsed = readConfigFile(file)
    const lc = lowercaseKeys(parsed)

    if (this.schema) {
      this.schema.parse(lc)
    }

    this.config = lc
  }

  mergeInConfig(): void {
    const file = this.resolveConfigFile()
    if (!file) {
      throw new Error(
        `config file not found: searched for "${this.configName}.${this.configType}" in [${this.configPaths.join(', ')}]`,
      )
    }
    this.configFilePath = file
    const parsed = readConfigFile(file)
    const lc = lowercaseKeys(parsed)

    if (this.schema) {
      this.schema.parse(deepMerge(this.config, lc))
    }

    this.config = deepMerge(this.config, lc)
  }

  mergeConfigMap(cfg: Record<string, unknown>): void {
    this.config = deepMerge(this.config, lowercaseKeys(cfg))
  }

  async writeConfig(): Promise<void> {
    const file = this.configFilePath
    if (!file) {
      throw new Error('no config file set or discovered; call readInConfig() or setConfigFile() first')
    }
    await this.writeConfigTo(file)
  }

  async writeConfigAs(path: string): Promise<void> {
    await this.writeConfigTo(path)
  }

  async safeWriteConfig(): Promise<void> {
    const file = this.configFilePath
    if (!file) {
      throw new Error('no config file set or discovered; call readInConfig() or setConfigFile() first')
    }
    const { existsSync } = await import('node:fs')
    if (existsSync(file)) {
      throw new Error(`config file already exists: ${file}`)
    }
    await this.writeConfigTo(file)
  }

  async safeWriteConfigAs(path: string): Promise<void> {
    const { existsSync } = await import('node:fs')
    if (existsSync(path)) {
      throw new Error(`config file already exists: ${path}`)
    }
    await this.writeConfigTo(path)
  }

  // --- Override ---

  set(key: string, value: unknown): void {
    const path = splitKey(key, this.keyDelim)
    deepSet(this.overrides, path, value)
  }

  // --- Getters ---

  get<T = unknown>(key: string): T | undefined {
    const realKey = this.resolveAlias(key.toLowerCase())
    const path = splitKey(realKey, this.keyDelim)

    // 1. Check overrides
    const fromOverride = deepGet(this.overrides, path)
    if (fromOverride !== undefined)
      return fromOverride as T

    // 2. Check env
    const fromEnv = resolveEnvKey(realKey, this.envPrefix, this.envBindings, this.autoEnv)
    if (fromEnv !== undefined)
      return fromEnv as T

    // 3. Check config
    const fromConfig = deepGet(this.config, path)
    if (fromConfig !== undefined)
      return fromConfig as T

    // 4. Check defaults
    const fromDefaults = deepGet(this.defaults, path)
    if (fromDefaults !== undefined)
      return fromDefaults as T

    return undefined
  }

  getString(key: string): string {
    const val = this.get(key)
    return val === undefined ? '' : String(val)
  }

  getNumber(key: string): number {
    const val = this.get(key)
    if (val === undefined)
      return 0
    const n = Number(val)
    return Number.isNaN(n) ? 0 : n
  }

  getBoolean(key: string): boolean {
    const val = this.get(key)
    if (val === undefined)
      return false
    if (typeof val === 'boolean')
      return val
    if (typeof val === 'string')
      return val.toLowerCase() === 'true' || val === '1'
    return Boolean(val)
  }

  getArray(key: string): unknown[] {
    const val = this.get(key)
    if (Array.isArray(val))
      return val
    return []
  }

  getObject(key: string): Record<string, unknown> {
    const val = this.get(key)
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return val as Record<string, unknown>
    }
    return {}
  }

  // --- Env vars ---

  setEnvPrefix(prefix: string): void {
    this.envPrefix = prefix.toUpperCase()
  }

  bindEnv(key: string, ...envVars: string[]): void {
    const lk = key.toLowerCase()
    const existing = this.envBindings.get(lk) ?? []
    if (envVars.length === 0) {
      // Bind to auto-derived name
      const envName = this.envPrefix
        ? `${this.envPrefix}_${lk.replace(/\./g, '_')}`.toUpperCase()
        : lk.replace(/\./g, '_').toUpperCase()
      existing.push(envName)
    }
    else {
      existing.push(...envVars)
    }
    this.envBindings.set(lk, existing)
  }

  automaticEnv(): void {
    this.autoEnv = true
  }

  // --- Introspection ---

  isSet(key: string): boolean {
    return this.get(key) !== undefined
  }

  allKeys(): string[] {
    const keySet = new Set<string>()
    for (const k of flattenKeys(this.defaults)) keySet.add(k)
    for (const k of flattenKeys(this.config)) keySet.add(k)
    for (const k of flattenKeys(this.overrides)) keySet.add(k)
    return [...keySet].sort()
  }

  allSettings(): TSchema extends ZodType ? Record<string, unknown> : Record<string, unknown> {
    let merged = deepMerge({}, this.defaults)
    merged = deepMerge(merged, this.config)
    merged = deepMerge(merged, this.overrides)

    // Apply env bindings on top
    for (const key of flattenKeys(merged)) {
      const envVal = resolveEnvKey(key, this.envPrefix, this.envBindings, this.autoEnv)
      if (envVal !== undefined) {
        deepSet(merged, splitKey(key, this.keyDelim), envVal)
      }
    }

    return merged as TSchema extends ZodType ? Record<string, unknown> : Record<string, unknown>
  }

  // --- Alias ---

  registerAlias(alias: string, key: string): void {
    const la = alias.toLowerCase()
    const lk = key.toLowerCase()
    if (la === lk) {
      throw new Error(`alias "${alias}" and key "${key}" are the same`)
    }
    this.aliases.set(la, lk)
  }

  // --- Sub-tree ---

  sub(key: string): Viper | undefined {
    const val = this.get<Record<string, unknown>>(key)
    if (val === null || val === undefined || typeof val !== 'object' || Array.isArray(val)) {
      return undefined
    }
    const child = new Viper()
    child.config = lowercaseKeys(val)
    return child
  }

  // --- Private helpers ---

  private resolveAlias(key: string): string {
    const seen = new Set<string>()
    let current = key
    while (this.aliases.has(current)) {
      if (seen.has(current)) {
        throw new Error(`circular alias detected: ${current}`)
      }
      seen.add(current)
      current = this.aliases.get(current)!
    }
    return current
  }

  private resolveConfigFile(): string | undefined {
    if (this.configFilePath)
      return this.configFilePath
    return findConfigFile(this.configName, this.configType, this.configPaths)
  }

  private async writeConfigTo(path: string): Promise<void> {
    const settings = this.allSettings()

    if (this.schema) {
      this.schema.parse(settings)
    }

    const content = json5.stringify(settings, null, 2).trimEnd().concat('\n')
    await atomicWriteFile(path, content)
  }
}
