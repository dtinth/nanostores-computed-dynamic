import { atom, computed, map } from 'nanostores'
import { computedDynamic } from 'nanostores-computed-dynamic'

{
  console.log('# Example 1')

  const $shape = atom('circle')
  const $radius = atom(4)
  const $width = atom(2)
  const $height = atom(3)

  const $area = computedDynamic((use) => {
    // `use($store)` is like `$store.get()` but it also tracks the dependency.
    // If you use `$store.get()` here, it will not be recalculated when `$store` changes.
    if (use($shape) === 'circle') {
      return Math.PI * use($radius) ** 2
    }
    if (use($shape) === 'rectangle') {
      return use($width) * use($height)
    }
  })

  $area.subscribe((value) => console.log(`Area is ${value}`))
  // The first time, it will subscribe to $shape and $radius.
  // => Area is 50.26548245743669

  $shape.set('rectangle')
  // $radius is not used anymore so it is unsubscribed.
  // $width and $height are subscribed instead.
  // => Area is 6

  $radius.set(10)
  // Since $radius is no longer subscribed, it will not trigger a recalculation.

  $width.set(5)
  // => Area is 15

  $height.set(6)
  // => Area is 30
}

console.log()

{
  console.log('# Example 2')

  const $users = map({
    u1: { name: 'John', feeling: '😀' },
    u2: { name: 'Mary', feeling: '😀' },
  })

  const $onlineUserIds = atom(['u1'])

  const $userById = (id) => computed($users, (users) => users[id])

  const $onlineUsers = computedDynamic((use) => {
    const onlineUserIds = use($onlineUserIds)
    return onlineUserIds.map((id) => use($userById(id)))
  })
  $onlineUsers.subscribe((users) =>
    console.log(
      `Online users: ${users.map((u) => `${u.name} ${u.feeling}`).join(', ')}`,
    ),
  )
  // => Online users: John 😀

  $onlineUserIds.set(['u2'])
  // => Online users: Mary 😀

  $users.setKey('u1', { name: 'John', feeling: '😐' })
  // Since `u1` is no longer subscribed to, it will not trigger a recalculation.

  $users.setKey('u2', { name: 'Mary', feeling: '😐' })
  // => Online users: Mary 😐
}
