/**
 * Aliases and sub-tree demo
 *
 * Run:
 *   npx tsx example/alias-sub.ts
 */
import { createViper } from '../src/index'

const v = createViper()

v.mergeConfigMap({
  database: {
    host: 'db.example.com',
    port: 5432,
    credentials: {
      user: 'admin',
      password: 'secret',
    },
  },
  cache: {
    host: 'redis.example.com',
    port: 6379,
  },
})

// Alias: shorthand access
v.registerAlias('db.host', 'database.host')
v.registerAlias('db.port', 'database.port')

console.log('=== Aliases ===')
console.log('db.host:', v.getString('db.host')) // resolves to database.host
console.log('db.port:', v.getNumber('db.port')) // resolves to database.port
console.log()

// Sub-tree: extract a section as independent Viper instance
const db = v.sub('database')
const cache = v.sub('cache')

console.log('=== Sub-tree: database ===')
console.log('host:', db?.getString('host'))
console.log('port:', db?.getNumber('port'))
console.log('credentials.user:', db?.getString('credentials.user'))
console.log()

console.log('=== Sub-tree: cache ===')
console.log('host:', cache?.getString('host'))
console.log('port:', cache?.getNumber('port'))
