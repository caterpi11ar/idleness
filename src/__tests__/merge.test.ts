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

  it('null in source deletes key (RFC 7386)', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: null })).toEqual({ b: 2 })
  })

  it('null deletes nested key', () => {
    const target = { a: { b: 1, c: 2 } }
    const source = { a: { b: null } }
    expect(deepMerge(target, source)).toEqual({ a: { c: 2 } })
  })

  it('does not mutate target', () => {
    const target = { a: { b: 1 } }
    const source = { a: { c: 2 } }
    const result = deepMerge(target, source)
    expect(target).toEqual({ a: { b: 1 } })
    expect(result).toEqual({ a: { b: 1, c: 2 } })
  })
})
