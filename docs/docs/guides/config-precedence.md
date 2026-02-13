---
sidebar_position: 1
---

# Config Precedence

viper manages configuration from multiple sources. When you call `v.get(key)`, it checks each source in priority order and returns the first match.

## Priority Order (highest to lowest)

| Priority | Source | Set via |
|----------|--------|---------|
| 1 | Override | `v.set(key, value)` |
| 2 | Environment variable | `v.bindEnv()` / `v.automaticEnv()` |
| 3 | Config file | `v.readInConfig()` |
| 4 | Default | `v.setDefault()` / `v.setDefaults()` |

## Example

```typescript
import { createViper } from 'viper'

const v = createViper()

// Priority 4: default
v.setDefault('port', 3000)
v.get('port') // 3000

// Priority 3: config file overwrites default
v.mergeConfigMap({ port: 8080 })
v.get('port') // 8080

// Priority 2: env var overwrites config
v.setEnvPrefix('APP')
v.automaticEnv()
// With APP_PORT=9090 in environment:
v.get('port') // '9090'

// Priority 1: override wins over everything
v.set('port', 4000)
v.get('port') // 4000
```

## Case Insensitivity

All keys are normalized to lowercase internally. These are all equivalent:

```typescript
v.set('Database.Host', 'myhost')
v.get('database.host') // 'myhost'
v.get('DATABASE.HOST') // 'myhost'
v.get('Database.Host') // 'myhost'
```

## Environment Variable Types

Environment variables are always strings. If you need a number or boolean, use the typed getters:

```typescript
// APP_PORT=8080
v.getNumber('port') // 8080 (number, not string)
v.getBoolean('debug') // true (for "true" or "1")
```
