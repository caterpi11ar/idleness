---
sidebar_position: 2
---

# Getting Started

## Installation

```bash
pnpm add @caterpillar-soft/viper
```

viper requires `zod` and `json5` as runtime dependencies (installed automatically).

## Basic Usage

```typescript
import { createViper } from '@caterpillar-soft/viper'

const v = createViper()

// Set defaults
v.setDefaults({
  host: 'localhost',
  port: 3000,
  database: {
    host: 'localhost',
    port: 5432,
  },
})

// Read values
v.get('host') // 'localhost'
v.getNumber('port') // 3000
v.get('database.host') // 'localhost'
```

## With a Config File

Create a config file `config.json5`:

```json5
{
  "host": "0.0.0.0",
  "port": 8080,
  "database": {
    "host": "db.example.com",
    "port": 5432
  }
}
```

Then read it:

```typescript
const v = createViper()

v.setDefaults({ host: 'localhost', port: 3000 })

v.addConfigPath('.') // search current directory
v.addConfigPath('./config') // also search ./config/
v.readInConfig()

v.get('host') // '0.0.0.0' (from config file, overrides default)
v.get('port') // 8080
```

## With Zod Validation

```typescript
import { createViper } from '@caterpillar-soft/viper'
import { z } from 'zod'

const schema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.object({
    host: z.string(),
    port: z.number(),
  }),
})

const v = createViper({ schema })

v.addConfigPath('.')
v.readInConfig() // throws ZodError if config doesn't match schema
```

## With Environment Variables

```typescript
const v = createViper()

v.setEnvPrefix('APP')
v.automaticEnv()

// APP_HOST=myhost node app.js
v.get('host') // 'myhost'

// Explicit binding for non-standard env var names
v.bindEnv('database.url', 'DATABASE_URL')
```

## Putting It All Together

```typescript
import { createViper } from '@caterpillar-soft/viper'
import { z } from 'zod'

const schema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.object({
    url: z.string(),
  }),
})

const v = createViper({ schema })

// 1. Defaults (lowest priority)
v.setDefaults({
  host: 'localhost',
  port: 3000,
  database: { url: 'postgres://localhost/mydb' },
})

// 2. Config file
v.setConfigName('config')
v.setConfigType('json5')
v.addConfigPath('.')
try {
  v.readInConfig()
  console.log('Using config file:', v.configFileUsed())
}
catch {
  console.log('No config file found, using defaults')
}

// 3. Environment variables
v.setEnvPrefix('APP')
v.automaticEnv()
v.bindEnv('database.url', 'DATABASE_URL')

// 4. Override (highest priority)
if (process.env.NODE_ENV === 'test') {
  v.set('database.url', 'postgres://localhost/testdb')
}

// Use it
console.log(v.getString('host'))
console.log(v.getNumber('port'))
console.log(v.getString('database.url'))
```
