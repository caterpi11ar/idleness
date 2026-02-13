---
sidebar_position: 4
---

# Schema Validation

viper optionally integrates with [Zod](https://zod.dev) to validate configuration at read and write time.

## Defining a Schema

Pass a Zod schema when creating the Viper instance:

```typescript
import { createViper } from '@caterpillar-soft/viper'
import { z } from 'zod'

const schema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.object({
    url: z.string().url(),
    pool: z.number().default(5),
  }),
})

const v = createViper({ schema })
```

## When Validation Happens

### On Read

`readInConfig()` and `mergeInConfig()` validate the parsed config against the schema. If validation fails, a `ZodError` is thrown:

```typescript
v.addConfigPath('.')

try {
  v.readInConfig()
}
catch (err) {
  if (err instanceof z.ZodError) {
    console.error('Invalid config:', err.issues)
  }
}
```

### On Write

`writeConfig()` and `writeConfigAs()` validate the merged settings before writing. This prevents writing invalid config to disk:

```typescript
v.set('port', 'not-a-number') // wrong type

await v.writeConfig() // throws ZodError
```

## Without Schema

The schema is entirely optional. Without it, viper works like plain Viper with no runtime validation:

```typescript
const v = createViper() // no schema
v.readInConfig() // parses JSON5, no validation
```

## Notes

- Zod's `.parse()` is used (throws on failure), not `.safeParse()`
- Zod `.default()` values are **not** automatically extracted — use `v.setDefault()` / `v.setDefaults()` to register defaults explicitly
- Schema validation applies to the config file content on read, and the merged settings on write
