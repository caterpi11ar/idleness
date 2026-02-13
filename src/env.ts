import process from 'node:process'

export function resolveEnvKey(
  key: string,
  prefix: string,
  envBindings: Map<string, string[]>,
  autoEnv: boolean,
): string | undefined {
  // Check explicit bindings first
  const bindings = envBindings.get(key)
  if (bindings) {
    for (const envVar of bindings) {
      const val = process.env[envVar]
      if (val !== undefined) {
        return val
      }
    }
  }

  // If autoEnv, derive env var name: {PREFIX}_{KEY} with dots → underscores, uppercased
  if (autoEnv) {
    const envName = prefix
      ? `${prefix}_${key.replace(/\./g, '_')}`.toUpperCase()
      : key.replace(/\./g, '_').toUpperCase()
    const val = process.env[envName]
    if (val !== undefined) {
      return val
    }
  }

  return undefined
}
