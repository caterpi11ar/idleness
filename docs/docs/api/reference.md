---
sidebar_position: 1
---

# API Reference

## `createViper(options?)`

Factory function that creates and returns a new `Viper` instance.

```typescript
import { createViper } from '@caterpillar-soft/viper'

const v = createViper()
const v = createViper({ schema, keyDelimiter: '.' })
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.schema` | `ZodType` | Optional Zod schema for validation |
| `options.keyDelimiter` | `string` | Key delimiter (default: `"."`) |

---

## Class: `Viper<TSchema>`

The main configuration manager. Can also be constructed directly:

```typescript
import { Viper } from '@caterpillar-soft/viper'

const v = new Viper()
const v = new Viper({ schema })
```

---

### Defaults

#### `setDefault(key, value)`

Set a single default value.

```typescript
v.setDefault('host', 'localhost')
v.setDefault('database.port', 5432)
```

#### `setDefaults(defaults)`

Merge an object into the defaults layer.

```typescript
v.setDefaults({
  host: 'localhost',
  port: 3000,
  database: { host: 'localhost' },
})
```

---

### Config File

#### `setConfigFile(path)`

Set the explicit path to the config file. Skips file discovery.

```typescript
v.setConfigFile('/etc/myapp/config.json5')
```

#### `setConfigName(name)`

Set the config file name (without extension). Default: `"config"`.

```typescript
v.setConfigName('settings')
```

#### `setConfigType(type)`

Set the config file extension. Default: `"json5"`.

```typescript
v.setConfigType('json')
```

#### `addConfigPath(path)`

Add a directory to the config file search path. Directories are searched in the order they are added.

```typescript
v.addConfigPath('/etc/myapp')
v.addConfigPath('.')
```

#### `readInConfig()`

Find, read, parse, and (optionally) validate the config file. Replaces the config layer.

- Throws if no config file is found
- Throws `ZodError` if schema validation fails

```typescript
v.readInConfig()
```

#### `mergeInConfig()`

Like `readInConfig()`, but merges into the existing config layer instead of replacing it.

```typescript
v.mergeInConfig()
```

#### `mergeConfigMap(cfg)`

Merge a plain object into the config layer.

```typescript
v.mergeConfigMap({ database: { pool: 10 } })
```

#### `configFileUsed()`

Returns the path of the config file that was read, or `undefined` if none.

```typescript
const path = v.configFileUsed()
```

---

### Write

#### `writeConfig()`

Write the current merged settings to the discovered config file path. Async, atomic.

- Throws if no config file path is known
- Throws `ZodError` if schema validation fails

```typescript
await v.writeConfig()
```

#### `writeConfigAs(path)`

Write to a specific file path.

```typescript
await v.writeConfigAs('/tmp/config.json5')
```

#### `safeWriteConfig()`

Write only if the config file doesn't already exist. Throws if it does.

```typescript
await v.safeWriteConfig()
```

#### `safeWriteConfigAs(path)`

Write to path only if it doesn't already exist. Throws if it does.

```typescript
await v.safeWriteConfigAs('/tmp/config.json5')
```

---

### Override

#### `set(key, value)`

Set an override value. Overrides have the highest priority.

```typescript
v.set('port', 9090)
v.set('database.host', 'override.example.com')
```

---

### Getters

#### `get<T>(key)`

Get a value from the config. Checks all layers in priority order. Returns `undefined` if not found.

```typescript
const host = v.get<string>('host')
```

#### `getString(key)`

Returns the value as a `string`. Returns `""` if not found.

```typescript
v.getString('host') // 'localhost'
```

#### `getNumber(key)`

Returns the value as a `number`. Returns `0` if not found or not a valid number.

```typescript
v.getNumber('port') // 3000
```

#### `getBoolean(key)`

Returns the value as a `boolean`. Returns `false` if not found. Recognizes `"true"` and `"1"` strings.

```typescript
v.getBoolean('debug') // true
```

#### `getArray(key)`

Returns the value as an array. Returns `[]` if the value is not an array.

```typescript
v.getArray('features') // ['auth', 'logging']
```

#### `getObject(key)`

Returns the value as a plain object. Returns `{}` if the value is not an object.

```typescript
v.getObject('database') // { host: 'localhost', port: 5432 }
```

---

### Environment Variables

#### `setEnvPrefix(prefix)`

Set the prefix for automatic env var names. The prefix is uppercased.

```typescript
v.setEnvPrefix('APP') // looks for APP_HOST, APP_PORT, etc.
```

#### `bindEnv(key, ...envVars)`

Bind a config key to one or more environment variable names. If no env var names are provided, the name is derived automatically using the prefix.

```typescript
v.bindEnv('database.url', 'DATABASE_URL')
v.bindEnv('host', 'APP_HOST', 'HOST') // tries in order
v.bindEnv('port') // auto-derives: APP_PORT
```

#### `automaticEnv()`

Enable automatic environment variable lookup for all keys. Env var names are derived as `{PREFIX}_{KEY}` with dots replaced by underscores, uppercased.

```typescript
v.automaticEnv()
```

---

### Introspection

#### `isSet(key)`

Returns `true` if the key has a value in any layer.

```typescript
v.isSet('host') // true
v.isSet('foo') // false
```

#### `allKeys()`

Returns a sorted array of all known keys across all layers.

```typescript
v.allKeys() // ['database.host', 'database.port', 'host', 'port']
```

#### `allSettings()`

Returns the merged config from all layers as a plain object. When a schema is provided, the return type is inferred from the schema.

```typescript
const config = v.allSettings()
// { host: 'localhost', port: 3000, database: { host: '...', port: 5432 } }
```

---

### Alias

#### `registerAlias(alias, key)`

Register an alias that resolves to another key on read.

```typescript
v.registerAlias('db.host', 'database.host')
v.get('db.host') // same as v.get('database.host')
```

- Throws if alias and key are the same
- Throws if a circular alias chain is detected

---

### Sub-tree

#### `sub(key)`

Returns a new `Viper` instance whose config is the nested object at the given key. Returns `undefined` if the key doesn't exist or isn't an object.

```typescript
const db = v.sub('database')
db?.getString('host') // 'localhost'
```
