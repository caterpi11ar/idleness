# idleness

Minimal Viper-inspired configuration library for TypeScript, powered by Zod and JSON5.

Configuration comes from multiple layered sources — defaults, config file, environment variables, and explicit overrides — unified into a single queryable registry with dot-notation key access.

## Features

- Layered config precedence: override > env > config file > defaults
- Dot-notation key access (`database.host`)
- Case-insensitive keys
- JSON5 config files with atomic write
- Environment variable binding (explicit + automatic with prefix)
- Optional Zod schema validation
- Key aliases and sub-tree extraction

## Install

```bash
pnpm add idleness
```

## Quick Start

```typescript
import { createViper } from 'idleness'
import { z } from 'zod'

const schema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.object({
    url: z.string(),
  }),
})

const v = createViper({ schema })

// Set defaults (lowest priority)
v.setDefaults({ host: 'localhost', port: 3000 })

// Read from config file
v.setConfigName('config')     // file name without extension
v.setConfigType('json5')      // file extension
v.addConfigPath('./config')   // search directory
v.addConfigPath('.')
v.readInConfig()

// Bind environment variables
v.setEnvPrefix('APP')
v.automaticEnv()              // APP_HOST, APP_PORT, APP_DATABASE_URL
v.bindEnv('database.url', 'DATABASE_URL')  // explicit binding

// Override (highest priority)
v.set('port', 8080)

// Read values
v.get('host')                 // => 'localhost'
v.getNumber('port')           // => 8080
v.getString('database.url')   // from env or config

// Introspection
v.isSet('host')               // => true
v.allKeys()                   // => ['database.url', 'host', 'port']
v.allSettings()               // merged config object

// Sub-tree
const db = v.sub('database')
db?.get('url')

// Write config
await v.writeConfigAs('./config/config.json5')
```

## Config Precedence

When reading a key, sources are checked in this order:

1. **Override** — values set via `v.set(key, value)`
2. **Environment** — bound env vars or automatic env lookup
3. **Config file** — parsed from JSON5 file
4. **Defaults** — values set via `v.setDefault()` / `v.setDefaults()`

## API

### Construction

```typescript
import { Viper, createViper } from 'idleness'

const v = new Viper()
const v = new Viper({ schema, keyDelimiter: '.' })
const v = createViper({ schema })
```

### Defaults

- `setDefault(key, value)` — set a single default
- `setDefaults(obj)` — merge an object into defaults

### Config File

- `setConfigFile(path)` — set explicit config file path
- `setConfigName(name)` — file name without extension (default: `"config"`)
- `setConfigType(type)` — file extension (default: `"json5"`)
- `addConfigPath(dir)` — add a directory to search
- `readInConfig()` — find, read, parse, and validate config file
- `mergeInConfig()` — like `readInConfig()` but merges into existing config
- `mergeConfigMap(obj)` — merge a plain object into config layer
- `configFileUsed()` — returns the discovered config file path

### Write

- `writeConfig()` — atomic write to discovered config path
- `writeConfigAs(path)` — atomic write to specific path
- `safeWriteConfig()` — write only if file doesn't exist
- `safeWriteConfigAs(path)` — write to path only if it doesn't exist

### Overrides

- `set(key, value)` — set an override (highest priority)

### Getters

- `get<T>(key)` — returns `T | undefined`
- `getString(key)` — returns `string` (empty string if missing)
- `getNumber(key)` — returns `number` (0 if missing or NaN)
- `getBoolean(key)` — returns `boolean` (false if missing)
- `getArray(key)` — returns `unknown[]` (empty array if not an array)
- `getObject(key)` — returns `Record<string, unknown>` (empty object if not an object)

### Environment Variables

- `setEnvPrefix(prefix)` — prefix for auto-derived env var names
- `bindEnv(key, ...envVars)` — bind key to specific env vars
- `automaticEnv()` — enable automatic env lookup (`{PREFIX}_{KEY}`, dots → underscores)

### Introspection

- `isSet(key)` — check if a key has a value in any layer
- `allKeys()` — sorted list of all known keys
- `allSettings()` — merged config from all layers

### Alias & Sub-tree

- `registerAlias(alias, key)` — alias resolves to real key on read
- `sub(key)` — returns a new `Viper` instance scoped to a nested key

## License

MIT
