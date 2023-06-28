import { it, expect, vi } from 'vitest'
import { atom, computed } from 'nanostores'
import { computedDynamic } from './index'

it('is computed but with dynamic dependencies', () => {
  const a = atom(1)
  const b = computedDynamic((use) => use(a) + 1)
  expect(b.get()).toBe(2)
})

it('does not recompute if dependencies have not changed', () => {
  const f = vi.fn()
  const a = atom(1)
  const b = computedDynamic((use) => (f(), use(a) + 1))
  b.get()
  b.get()
  b.get()
  expect(f).toHaveBeenCalledTimes(1)
})

it('recomputes just once in case of diamond dependencies', () => {
  const f = vi.fn()
  const a = atom(1)
  const b = computed(a, (x) => x + 1)
  const c = computed(a, (x) => x + 2)
  const d = computedDynamic((use) => (f(), use(b) * use(c)))
  expect(d.get()).toBe(6)
  a.set(2)
  expect(d.get()).toBe(12)
  expect(f).toHaveBeenCalledTimes(2)
})

it('does not hold on to stale dependencies', () => {
  const counter = vi.fn()
  const f = vi.fn()
  const switcher = atom('a' as 'a' | 'b')
  const a = atom('a1')
  const b = atom('b1')
  const c = computedDynamic((use) => {
    counter()
    if (use(switcher) === 'a') {
      return use(a)
    } else {
      return use(b)
    }
  })
  const unsubscribe = c.subscribe(() => f(c.get()))
  try {
    expect(f).toHaveBeenCalledWith('a1')
    expect(counter).toHaveBeenCalledTimes(1)

    a.set('a2')
    expect(f).toHaveBeenCalledWith('a2')
    expect(counter).toHaveBeenCalledTimes(2)

    switcher.set('b')
    expect(f).toHaveBeenCalledWith('b1')
    expect(counter).toHaveBeenCalledTimes(3)

    a.set('a3')
    expect(f).toHaveBeenCalledWith('b1')
    expect(counter).toHaveBeenCalledTimes(3)

    b.set('b2')
    expect(f).toHaveBeenCalledWith('b2')
    expect(counter).toHaveBeenCalledTimes(4)
  } finally {
    unsubscribe()
  }
})

it('works with a store of store', () => {
  const counter = vi.fn()
  const f = vi.fn()
  const a = atom('a1')
  const b = atom('b1')
  const switcher = atom(a)
  const c = computedDynamic((use) => {
    counter()
    return use(use(switcher)) // don't do this for real
  })
  const unsubscribe = c.subscribe(() => f(c.get()))
  try {
    expect(f).toHaveBeenCalledWith('a1')
    expect(counter).toHaveBeenCalledTimes(1)

    a.set('a2')
    expect(f).toHaveBeenCalledWith('a2')
    expect(counter).toHaveBeenCalledTimes(2)

    switcher.set(b)
    expect(f).toHaveBeenCalledWith('b1')
    expect(counter).toHaveBeenCalledTimes(3)

    a.set('a3')
    expect(f).toHaveBeenCalledWith('b1')
    expect(counter).toHaveBeenCalledTimes(3)

    b.set('b2')
    expect(f).toHaveBeenCalledWith('b2')
    expect(counter).toHaveBeenCalledTimes(4)
  } finally {
    unsubscribe()
  }
})
