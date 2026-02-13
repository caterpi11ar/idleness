# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install      # 安装依赖 (必须使用 pnpm)
pnpm build        # 使用 tsup 构建 (输出到 dist/)
pnpm test         # 运行 vitest 测试
pnpm test:watch   # vitest 监听模式
pnpm lint:fix     # Lint 并自动修复
pnpm typecheck    # 类型检查
```

## Project Overview

viper is a Viper-inspired TypeScript configuration library. It provides layered config management (defaults, config file, env vars, overrides) with dot-notation key access, Zod validation, and JSON5 parsing.

## Architecture

```
src/
├── index.ts        # Public API barrel export (Viper, createViper, ViperOptions)
├── viper.ts        # Main Viper class (core logic, layered storage)
├── types.ts        # TypeScript interfaces (ViperOptions)
├── keys.ts         # Dot-notation utilities (deepGet, deepSet, deepDelete, flattenKeys)
├── io.ts           # File I/O (JSON5 parse, atomic write, config file discovery)
├── env.ts          # Environment variable resolution (prefix, bind, automaticEnv)
├── merge.ts        # Deep merge utility (RFC 7386 null-delete)
└── __tests__/      # Vitest test suites (colocated)
```

## Technical Stack

- **Runtime:** Node.js >= 22.0.0
- **Package Manager:** pnpm 10.27.0 (enforced via preinstall hook)
- **Language:** TypeScript (ES2022, strict mode)
- **Build:** tsup (ESM output + .d.ts)
- **Test:** vitest
- **Linting:** ESLint with @antfu/eslint-config
- **Commits:** Conventional commits enforced via commitlint
- **Dependencies:** zod (validation), json5 (parsing)

## Path Aliases

- `@/` maps to `./src/`

## Code Style

ESLint rules follow @antfu/eslint-config with these overrides:
- `no-console`: allowed
- `no-new`: allowed
- `regexp/no-unused-capturing-group`: allowed

## Key Design Decisions

- All keys are **case-insensitive** (lowercased internally)
- Config file reads are **sync**, writes are **async** (atomic with backup)
- Zod schema is **optional** — library works without it
- Config precedence: override > env > config file > defaults
