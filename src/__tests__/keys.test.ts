import { describe, expect, it } from 'vitest'
import { deepDelete, deepGet, deepSet, flattenKeys, splitKey } from '../keys'

describe('splitKey', () => {
  it('splits a dotted key', () => {
    expect(splitKey('a.b.c', '.')).toEqual(['a', 'b', 'c'])
  })

  it('lowercases all segments', () => {
    expect(splitKey('Foo.BAR.Baz', '.')).toEqual(['foo', 'bar', 'baz'])
  })

  it('filters empty segments', () => {
    expect(splitKey('a..b', '.')).toEqual(['a', 'b'])
  })

  it('supports custom delimiter', () => {
    expect(splitKey('a/b/c', '/')).toEqual(['a', 'b', 'c'])
  })

  it('returns single segment for key without delimiter', () => {
    expect(splitKey('host', '.')).toEqual(['host'])
  })

  it('handles key that is entirely delimiters', () => {
    expect(splitKey('...', '.')).toEqual([])
  })

  it('handles leading and trailing delimiters', () => {
    expect(splitKey('.a.b.', '.')).toEqual(['a', 'b'])
  })
})

describe('deepGet', () => {
  it('gets a nested value', () => {
    expect(deepGet({ a: { b: { c: 42 } } }, ['a', 'b', 'c'])).toBe(42)
  })

  it('returns undefined for missing path', () => {
    expect(deepGet({ a: 1 }, ['b'])).toBeUndefined()
  })

  it('returns undefined for null intermediate', () => {
    expect(deepGet({ a: null } as Record<string, unknown>, ['a', 'b'])).toBeUndefined()
  })

  it('returns undefined for primitive intermediate', () => {
    expect(deepGet({ a: 42 } as Record<string, unknown>, ['a', 'b'])).toBeUndefined()
  })

  it('returns undefined for undefined intermediate', () => {
    expect(deepGet({ a: undefined } as Record<string, unknown>, ['a', 'b'])).toBeUndefined()
  })

  it('returns object node', () => {
    const obj = { a: { b: 1, c: 2 } }
    expect(deepGet(obj, ['a'])).toEqual({ b: 1, c: 2 })
  })

  it('returns the root object for empty path', () => {
    const obj = { a: 1 }
    expect(deepGet(obj, [])).toEqual({ a: 1 })
  })

  it('returns array values', () => {
    expect(deepGet({ a: [1, 2, 3] }, ['a'])).toEqual([1, 2, 3])
  })

  it('returns boolean false without treating it as missing', () => {
    expect(deepGet({ a: false } as Record<string, unknown>, ['a'])).toBe(false)
  })

  it('returns 0 without treating it as missing', () => {
    expect(deepGet({ a: 0 } as Record<string, unknown>, ['a'])).toBe(0)
  })

  it('returns empty string without treating it as missing', () => {
    expect(deepGet({ a: '' } as Record<string, unknown>, ['a'])).toBe('')
  })

  it('traverses 3+ levels deep', () => {
    expect(deepGet({ a: { b: { c: { d: { e: 'deep' } } } } }, ['a', 'b', 'c', 'd', 'e'])).toBe('deep')
  })
})

describe('deepSet', () => {
  it('sets a deeply nested value', () => {
    const obj: Record<string, unknown> = {}
    deepSet(obj, ['a', 'b', 'c'], 42)
    expect(obj).toEqual({ a: { b: { c: 42 } } })
  })

  it('overwrites existing value', () => {
    const obj: Record<string, unknown> = { a: { b: 1 } }
    deepSet(obj, ['a', 'b'], 2)
    expect(obj).toEqual({ a: { b: 2 } })
  })

  it('creates intermediate objects when path passes through primitive', () => {
    const obj: Record<string, unknown> = { a: 'string' }
    deepSet(obj, ['a', 'b'], 1)
    expect(obj).toEqual({ a: { b: 1 } })
  })

  it('creates intermediate objects when path passes through null', () => {
    const obj: Record<string, unknown> = { a: null }
    deepSet(obj, ['a', 'b'], 1)
    expect(obj).toEqual({ a: { b: 1 } })
  })

  it('creates intermediate objects when path passes through array', () => {
    const obj: Record<string, unknown> = { a: [1, 2] }
    deepSet(obj, ['a', 'b'], 1)
    expect(obj).toEqual({ a: { b: 1 } })
  })

  it('creates intermediate objects when path passes through undefined', () => {
    const obj: Record<string, unknown> = {}
    deepSet(obj, ['a', 'b'], 1)
    expect(obj).toEqual({ a: { b: 1 } })
  })

  it('does nothing for empty path', () => {
    const obj: Record<string, unknown> = { a: 1 }
    deepSet(obj, [], 2)
    expect(obj).toEqual({ a: 1 })
  })

  it('sets a top-level key', () => {
    const obj: Record<string, unknown> = {}
    deepSet(obj, ['a'], 42)
    expect(obj).toEqual({ a: 42 })
  })

  it('preserves existing sibling keys', () => {
    const obj: Record<string, unknown> = { a: { b: 1, c: 2 } }
    deepSet(obj, ['a', 'd'], 3)
    expect(obj).toEqual({ a: { b: 1, c: 2, d: 3 } })
  })

  it('can set value to null', () => {
    const obj: Record<string, unknown> = { a: 1 }
    deepSet(obj, ['a'], null)
    expect(obj).toEqual({ a: null })
  })

  it('can set value to array', () => {
    const obj: Record<string, unknown> = {}
    deepSet(obj, ['a'], [1, 2, 3])
    expect(obj).toEqual({ a: [1, 2, 3] })
  })
})

describe('deepDelete', () => {
  it('deletes a nested key', () => {
    const obj: Record<string, unknown> = { a: { b: 1, c: 2 } }
    deepDelete(obj, ['a', 'b'])
    expect(obj).toEqual({ a: { c: 2 } })
  })

  it('deletes a top-level key', () => {
    const obj: Record<string, unknown> = { a: 1, b: 2 }
    deepDelete(obj, ['a'])
    expect(obj).toEqual({ b: 2 })
  })

  it('does nothing for missing path', () => {
    const obj: Record<string, unknown> = { a: 1 }
    deepDelete(obj, ['x', 'y'])
    expect(obj).toEqual({ a: 1 })
  })

  it('does nothing for empty path', () => {
    const obj: Record<string, unknown> = { a: 1 }
    deepDelete(obj, [])
    expect(obj).toEqual({ a: 1 })
  })

  it('does nothing when intermediate is a primitive', () => {
    const obj: Record<string, unknown> = { a: 42 }
    deepDelete(obj, ['a', 'b'])
    expect(obj).toEqual({ a: 42 })
  })

  it('does nothing when intermediate is null', () => {
    const obj: Record<string, unknown> = { a: null }
    deepDelete(obj, ['a', 'b'])
    expect(obj).toEqual({ a: null })
  })

  it('deletes deeply nested key (3+ levels)', () => {
    const obj: Record<string, unknown> = { a: { b: { c: 1, d: 2 } } }
    deepDelete(obj, ['a', 'b', 'c'])
    expect(obj).toEqual({ a: { b: { d: 2 } } })
  })

  it('does nothing when final key does not exist', () => {
    const obj: Record<string, unknown> = { a: { b: 1 } }
    deepDelete(obj, ['a', 'nonexistent'])
    expect(obj).toEqual({ a: { b: 1 } })
  })
})

describe('flattenKeys', () => {
  it('flattens nested object to dot-notation keys', () => {
    const result = flattenKeys({ a: { b: 1, c: { d: 2 } }, e: 3 })
    expect(result.sort()).toEqual(['a.b', 'a.c.d', 'e'])
  })

  it('handles empty object', () => {
    expect(flattenKeys({})).toEqual([])
  })

  it('handles arrays as leaf values', () => {
    expect(flattenKeys({ a: [1, 2, 3] })).toEqual(['a'])
  })

  it('uses prefix', () => {
    expect(flattenKeys({ b: 1 }, 'a')).toEqual(['a.b'])
  })

  it('treats null as a leaf value', () => {
    expect(flattenKeys({ a: null } as Record<string, unknown>)).toEqual(['a'])
  })

  it('handles flat object (no nesting)', () => {
    expect(flattenKeys({ a: 1, b: 2, c: 3 }).sort()).toEqual(['a', 'b', 'c'])
  })

  it('handles deeply nested object', () => {
    expect(flattenKeys({ a: { b: { c: { d: 1 } } } })).toEqual(['a.b.c.d'])
  })

  it('handles object with mixed value types', () => {
    const result = flattenKeys({
      str: 'hello',
      num: 42,
      bool: true,
      arr: [1],
      nested: { key: 'val' },
    })
    expect(result.sort()).toEqual(['arr', 'bool', 'nested.key', 'num', 'str'])
  })

  it('prefix propagates through nesting', () => {
    const result = flattenKeys({ b: { c: 1 } }, 'a')
    expect(result).toEqual(['a.b.c'])
  })
})
