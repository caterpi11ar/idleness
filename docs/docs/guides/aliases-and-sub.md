---
sidebar_position: 5
---

# Aliases & Sub-tree

## Aliases

Aliases let you access the same configuration value through a different key name:

```typescript
const v = createViper()

v.set('database.host', 'myhost')
v.registerAlias('db.host', 'database.host')

v.get('db.host') // 'myhost'
v.get('database.host') // 'myhost'
```

### Use Cases

- **Backward compatibility** — rename a config key without breaking existing code
- **Shorthand** — provide shorter aliases for deeply nested keys

### Constraints

- An alias and its target cannot be the same key (throws an error)
- Alias chains are resolved (alias A -> B -> C works)
- Circular aliases are detected and throw an error

```typescript
// These both throw:
v.registerAlias('key', 'key') // same key
v.registerAlias('a', 'b')
v.registerAlias('b', 'a') // circular
```

## Sub-tree

Extract a nested section of config as a new independent `Viper` instance:

```typescript
const v = createViper()

v.mergeConfigMap({
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      user: 'admin',
      password: 'secret',
    },
  },
})

const db = v.sub('database')

db.get('host') // 'localhost'
db.get('port') // 5432
db.get('credentials.user') // 'admin'
```

### Behavior

- `sub()` returns a new `Viper` instance whose config layer is the nested object
- Returns `undefined` if the key doesn't exist or isn't an object
- The sub-Viper is independent — changes to it don't affect the parent

```typescript
const v = createViper()
v.set('key', 'string')
v.sub('key') // undefined (not an object)
v.sub('nonexistent') // undefined
```

### Passing Config Sections

`sub()` is useful for passing a config section to a module without exposing the full config:

```typescript
function initDatabase(config: Viper) {
  const host = config.getString('host')
  const port = config.getNumber('port')
  // ...
}

initDatabase(v.sub('database')!)
```
