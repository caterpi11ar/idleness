/**
 * Environment variable binding demo
 *
 * Run:
 *   APP_HOST=myhost APP_PORT=4000 DATABASE_URL=postgres://prod/db npx tsx example/env.ts
 */
import { createViper } from '../src/index'

const v = createViper()

v.setDefaults({
  host: 'localhost',
  port: 3000,
})

// Automatic env: prefix + key → APP_HOST, APP_PORT, etc.
v.setEnvPrefix('APP')
v.automaticEnv()

// Explicit binding for non-standard names
v.bindEnv('database.url', 'DATABASE_URL')

console.log('=== Environment Variables ===')
console.log('host:', v.getString('host'))
console.log('port:', v.getNumber('port'))
console.log('database.url:', v.getString('database.url'))
