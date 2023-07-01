import { ReadableAtom, atom, onMount } from 'nanostores'

export function computedDynamic<TValue>(
  logic: (use: <T>(atom: ReadableAtom<T>) => T) => TValue,
): ReadableAtom<TValue> {
  const derived = atom<TValue>(undefined as unknown as TValue)

  let dependencyCache: Map<ReadableAtom<any>, any> | undefined
  let subscriptions = new Map<ReadableAtom<any>, () => void>()
  let mounted = false

  const dependenciesHaveChanged = () => {
    // We don’t know which dependencies we have, so we need to run the logic to find out.
    if (!dependencyCache) return true

    // If any of the dependencies have changed, we need to re-run the logic.
    for (const [store, value] of dependencyCache) {
      if (store.get() !== value) return true
    }

    // None of the dependencies have changed.
    return false
  }

  const update = () => {
    if (dependenciesHaveChanged()) {
      const newDependencyCache = new Map<ReadableAtom<any>, any>()
      let tooLate = false
      const newValue = logic((store) => {
        if (tooLate) {
          throw new TooLateError()
        }
        if (newDependencyCache.has(store)) {
          return newDependencyCache.get(store)
        }
        const value = store.get()
        newDependencyCache.set(store, value)
        return value
      })
      tooLate = true
      dependencyCache = newDependencyCache
      updateListeners()
      derived.set(newValue)
    }
  }

  const updateListeners = () => {
    const toRemove = new Set(subscriptions.keys())
    const target: Iterable<ReadableAtom<any>> =
      mounted && dependencyCache ? dependencyCache.keys() : []
    for (const store of target) {
      toRemove.delete(store)
      if (!subscriptions.has(store)) {
        subscriptions.set(store, store.subscribe(createSubscriber(store)))
      }
    }
    for (const store of toRemove) {
      subscriptions.get(store)!()
      subscriptions.delete(store)
    }
  }

  const createSubscriber = (store: ReadableAtom<any>) => {
    return () => {
      if (!dependencyCache) return
      if (!dependencyCache.has(store)) return
      if (dependencyCache.get(store) === store.get()) return
      update()
    }
  }

  onMount(derived, () => {
    mounted = true
    update()
    return () => {
      mounted = false
      updateListeners()
    }
  })

  return derived
}

export class TooLateError extends Error {
  constructor() {
    super(
      'You can only call `use` synchronously inside the `computedDynamic` callback.',
    )
    this.name = 'TooLateError'
  }
}
