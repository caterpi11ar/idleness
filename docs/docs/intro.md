---
sidebar_position: 1
slug: /
---

# Introduction

**idleness** is a minimal, Viper-inspired configuration management library for TypeScript. It draws inspiration from Go's [spf13/viper](https://github.com/spf13/viper) and brings the same layered configuration model to the TypeScript ecosystem.

## Why idleness?

Managing application configuration often involves juggling multiple sources: config files, environment variables, defaults, and runtime overrides. idleness unifies them into a single registry with clear precedence rules.

### Core Concepts

- **Layered sources** — defaults, config file, environment variables, and explicit overrides are merged with well-defined priority
- **Dot-notation keys** — access nested config via `database.host` instead of `config.database.host`
- **Case-insensitive** — `DATABASE.HOST`, `database.host`, and `Database.Host` all resolve to the same key
- **JSON5 config files** — comments, trailing commas, and unquoted keys in your config files
- **Zod validation** — optional schema validation at read and write time
- **Atomic writes** — config file writes use temp file + rename for crash safety

### Precedence Order

When you read a key, idleness checks sources in this order (first match wins):

1. **Override** — `v.set(key, value)`
2. **Environment variable** — bound or automatic env lookup
3. **Config file** — parsed JSON5 file
4. **Default** — `v.setDefault(key, value)`

## Next Steps

- [Getting Started](./getting-started) — install and write your first config
- [Guides](./guides/config-precedence) — learn how each feature works
- [API Reference](./api/reference) — full method documentation
