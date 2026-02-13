export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const sourceVal = source[key]

    // null in source deletes key (RFC 7386 style)
    if (sourceVal === null) {
      delete result[key]
      continue
    }

    const targetVal = result[key]

    if (
      typeof sourceVal === 'object'
      && !Array.isArray(sourceVal)
      && typeof targetVal === 'object'
      && targetVal !== null
      && !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      )
    }
    else {
      result[key] = sourceVal
    }
  }

  return result
}
