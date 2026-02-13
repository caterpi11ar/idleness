---
sidebar_position: 2
---

# Config Files

idleness uses [JSON5](https://json5.org/) for config files, which supports comments, trailing commas, and unquoted keys.

## Reading Config Files

### File Discovery

Tell idleness where to search and what to look for:

```typescript
const v = createViper()

v.setConfigName('config') // filename without extension (default: "config")
v.setConfigType('json5') // file extension (default: "json5")
v.addConfigPath('/etc/myapp') // search here first
v.addConfigPath('.') // then current directory

v.readInConfig()
```

idleness searches each path in order for `{configName}.{configType}` and uses the first match.

### Explicit Path

If you know the exact file path:

```typescript
v.setConfigFile('/etc/myapp/settings.json5')
v.readInConfig()
```

### Check Which File Was Used

```typescript
v.readInConfig()
console.log(v.configFileUsed()) // '/etc/myapp/config.json5'
```

## Merging Config Files

`readInConfig()` replaces the config layer entirely. Use `mergeInConfig()` to merge instead:

```typescript
v.addConfigPath('./defaults')
v.readInConfig() // load base config

v.addConfigPath('./local')
v.mergeInConfig() // merge local overrides
```

You can also merge a plain object into the config layer:

```typescript
v.mergeConfigMap({
  database: {
    pool: { min: 2, max: 10 },
  },
})
```

## Writing Config Files

### Write to Discovered Path

After reading a config file, write the merged config back:

```typescript
v.readInConfig()
v.set('port', 9090)
await v.writeConfig() // writes to the same file that was read
```

### Write to a Specific Path

```typescript
await v.writeConfigAs('/tmp/config.json5')
```

### Safe Write (No Overwrite)

```typescript
// Only writes if the file doesn't already exist
await v.safeWriteConfig()
await v.safeWriteConfigAs('/tmp/config.json5')
```

### Atomic Writes

All write operations are atomic:

1. Data is written to a temporary file
2. Permissions are set to `0o600` (owner read/write only)
3. The existing file is backed up to `{path}.bak`
4. The temp file is renamed to the target path

This ensures that a crash mid-write won't corrupt your config file.

## JSON5 Format

A typical `config.json5`:

```json5
{
  // Server settings
  "host": "0.0.0.0",
  "port": 8080,

  "database": {
    "host": "db.example.com",
    "port": 5432,
    "name": "myapp"
  },

  // Feature flags
  "features": ["auth", "logging"]
}
```
