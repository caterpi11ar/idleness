---
sidebar_position: 3
---

# Environment Variables

viper supports reading configuration from environment variables, with higher priority than config files and defaults.

## Automatic Environment

Enable automatic environment variable lookup with a prefix:

```typescript
const v = createViper()

v.setEnvPrefix('APP')
v.automaticEnv()
```

When `automaticEnv()` is enabled, any `get(key)` call will also check for a matching environment variable. The env var name is derived by:

1. Prepending the prefix (if set)
2. Replacing dots with underscores
3. Uppercasing everything

| Key | Env Var (prefix: `APP`) | Env Var (no prefix) |
|-----|------------------------|---------------------|
| `host` | `APP_HOST` | `HOST` |
| `database.host` | `APP_DATABASE_HOST` | `DATABASE_HOST` |
| `log.level` | `APP_LOG_LEVEL` | `LOG_LEVEL` |

## Explicit Binding

For env vars that don't follow the naming convention, bind them explicitly:

```typescript
v.bindEnv('database.url', 'DATABASE_URL')
v.bindEnv('redis.host', 'REDIS_HOST', 'CACHE_HOST') // tries each in order
```

Multiple env var names can be bound to a single key. viper checks them in order and returns the first defined value.

## Binding Without Arguments

Calling `bindEnv` without explicit env var names derives the name automatically (using the prefix):

```typescript
v.setEnvPrefix('APP')
v.bindEnv('database.host') // binds to APP_DATABASE_HOST
```

The difference from `automaticEnv()` is that `bindEnv` registers a specific key, while `automaticEnv` applies to all keys.

## Live Reads

Environment variables are read from `process.env` on every `get()` call. They are never cached, so changes to the environment are reflected immediately:

```typescript
process.env.APP_HOST = 'first'
v.get('host') // 'first'

process.env.APP_HOST = 'second'
v.get('host') // 'second'
```

## Precedence with Other Sources

Environment variables have higher priority than config files and defaults, but lower than explicit overrides:

```typescript
v.setDefault('host', 'default-host') // priority 4
// config file sets host to 'config-host'      // priority 3
// APP_HOST=env-host                           // priority 2
v.set('host', 'override-host') // priority 1

v.get('host') // 'override-host'
```

Remove the override and it falls through to env:

```typescript
v.get('host') // 'env-host' (from APP_HOST)
```
