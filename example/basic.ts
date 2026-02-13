/**
 * Basic usage — defaults, config file, getters
 *
 * Run:
 *   npx tsx example/basic.ts
 */
import { createViper } from '../src/index'

const v = createViper()

// 1. Set defaults (lowest priority)
v.setDefaults({
  host: 'localhost',
  port: 3000,
  database: {
    host: 'localhost',
    port: 5432,
    name: 'dev',
  },
  debug: false,
})

// 2. Read config file (overrides defaults)
v.setConfigName('config')
v.setConfigType('json5')
v.addConfigPath('./example')
v.readInConfig()

console.log('=== Basic Usage ===')
console.log('Config file used:', v.configFileUsed())
console.log()

console.log('host:', v.getString('host')) // from config: '0.0.0.0'
console.log('port:', v.getNumber('port')) // from config: 8080
console.log('database.host:', v.getString('database.host')) // from config: 'db.example.com'
console.log('database.name:', v.getString('database.name')) // from config: 'myapp'
console.log('debug:', v.getBoolean('debug')) // from config: true
console.log()

// 3. Override (highest priority)
v.set('port', 9090)
console.log('port after override:', v.getNumber('port')) // 9090
console.log()

// 4. Introspection
console.log('isSet("host"):', v.isSet('host'))
console.log('isSet("nonexistent"):', v.isSet('nonexistent'))
console.log('allKeys:', v.allKeys())
console.log()

console.log('allSettings:', JSON.stringify(v.allSettings(), null, 2))
