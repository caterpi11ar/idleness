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

  it('returns object node', () => {
    const obj = { a: { b: 1, c: 2 } }
    expect(deepGet(obj, ['a'])).toEqual({ b: 1, c: 2 })
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

  it('does nothing for empty path', () => {
    const obj: Record<string, unknown> = { a: 1 }
    deepSet(obj, [], 2)
    expect(obj).toEqual({ a: 1 })
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
})
