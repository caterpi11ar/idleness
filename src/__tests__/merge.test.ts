import { describe, expect, it } from 'vitest'
import { deepMerge } from '../merge'

describe('deepMerge', () => {
  it('merges flat objects', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('source overwrites target for primitives', () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
  })

  it('merges nested objects recursively', () => {
    const target = { a: { b: 1, c: 2 } }
    const source = { a: { c: 3, d: 4 } }
    expect(deepMerge(target, source)).toEqual({ a: { b: 1, c: 3, d: 4 } })
  })

  it('source array overwrites target array', () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] })
  })

  it('source array overwrites target object', () => {
    expect(deepMerge({ a: { b: 1 } }, { a: [1, 2] })).toEqual({ a: [1, 2] })
  })

  it('source object overwrites target primitive', () => {
    expect(deepMerge({ a: 'string' }, { a: { b: 1 } })).toEqual({ a: { b: 1 } })
  })

  it('source primitive overwrites target object', () => {
    expect(deepMerge({ a: { b: 1 } }, { a: 42 })).toEqual({ a: 42 })
  })

  it('null in source deletes key (RFC 7386)', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: null })).toEqual({ b: 2 })
  })

  it('null deletes nested key', () => {
    const target = { a: { b: 1, c: 2 } }
    const source = { a: { b: null } }
    expect(deepMerge(target, source)).toEqual({ a: { c: 2 } })
  })

  it('null deletes the only key leaving empty object', () => {
    expect(deepMerge({ a: { b: 1 } }, { a: { b: null } })).toEqual({ a: {} })
  })

  it('does not mutate target', () => {
    const target = { a: { b: 1 } }
    const source = { a: { c: 2 } }
    const result = deepMerge(target, source)
    expect(target).toEqual({ a: { b: 1 } })
    expect(result).toEqual({ a: { b: 1, c: 2 } })
  })

  it('does not mutate source', () => {
    const target = { a: 1 }
    const source = { b: 2 }
    deepMerge(target, source)
    expect(source).toEqual({ b: 2 })
  })

  it('merges empty source into target (no-op)', () => {
    expect(deepMerge({ a: 1, b: 2 }, {})).toEqual({ a: 1, b: 2 })
  })

  it('merges source into empty target', () => {
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 })
  })

  it('merges two empty objects', () => {
    expect(deepMerge({}, {})).toEqual({})
  })

  it('merges deeply nested objects (3+ levels)', () => {
    const target = { a: { b: { c: { d: 1, e: 2 } } } }
    const source = { a: { b: { c: { e: 3, f: 4 } } } }
    expect(deepMerge(target, source)).toEqual({
      a: { b: { c: { d: 1, e: 3, f: 4 } } },
    })
  })

  it('handles source with undefined values (kept, not deleted)', () => {
    const result = deepMerge({ a: 1 }, { a: undefined } as Record<string, unknown>)
    expect(result).toEqual({ a: undefined })
  })

  it('source array overwrites target array (not concatenated)', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [4] })).toEqual({ list: [4] })
  })

  it('target has array, source has object', () => {
    expect(deepMerge({ a: [1, 2] }, { a: { b: 1 } })).toEqual({ a: { b: 1 } })
  })

  it('handles multiple keys at same level', () => {
    const target = { a: 1, b: 2, c: 3 }
    const source = { b: 20, d: 40 }
    expect(deepMerge(target, source)).toEqual({ a: 1, b: 20, c: 3, d: 40 })
  })
})
