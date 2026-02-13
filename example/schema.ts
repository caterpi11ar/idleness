/**
 * Zod schema validation demo
 *
 * Run:
 *   npx tsx example/schema.ts
 */
import { z } from 'zod'
import { createViper } from '../src/index'

const schema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
  }),
  debug: z.boolean(),
})

const v = createViper({ schema })

// Read config file — validated against schema
v.addConfigPath('./example')
v.readInConfig()

console.log('=== Schema Validation ===')
console.log('Config is valid!')
console.log('host:', v.getString('host'))
console.log('port:', v.getNumber('port'))
console.log('database:', v.getObject('database'))
console.log()

// Demonstrate validation error
const v2 = createViper({ schema })
v2.setDefaults({ host: 'localhost', port: 99999 }) // port out of range

try {
  v2.addConfigPath('./nonexistent')
  v2.readInConfig()
}
catch (err) {
  console.log('Expected error (no config file):', (err as Error).message)
}
