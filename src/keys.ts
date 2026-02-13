export function splitKey(key: string, delim: string): string[] {
  return key.toLowerCase().split(delim).filter(Boolean)
}

export function deepGet(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj
  for (const segment of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function deepSet(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0)
    return
  let current: Record<string, unknown> = obj
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]
    const next = current[segment]
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next)) {
      const created: Record<string, unknown> = {}
      current[segment] = created
      current = created
    }
    else {
      current = next as Record<string, unknown>
    }
  }
  current[path[path.length - 1]] = value
}

export function deepDelete(obj: Record<string, unknown>, path: string[]): void {
  if (path.length === 0)
    return
  if (path.length === 1) {
    delete obj[path[0]]
    return
  }
  let current: unknown = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return
    }
    current = (current as Record<string, unknown>)[path[i]]
  }
  if (current !== null && current !== undefined && typeof current === 'object') {
    delete (current as Record<string, unknown>)[path[path.length - 1]]
  }
}

export function flattenKeys(obj: Record<string, unknown>, prefix?: string): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    }
    else {
      keys.push(fullKey)
    }
  }
  return keys
}
