// Тесты клиентского store пакетов апрува (client/approval-store.js).
// Запуск: node test/approval-store.test.mjs (из repo/).

import assert from 'node:assert/strict'

import { createApprovalStore } from '../client/approval-store.js'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// Пакеты-заготовки: store важны только requestId и rootSessionId.
const packet = (requestId, rootSessionId) => ({ requestId, rootSessionId })

// Мок remote-сервиса: подписки отыгрывают зарегистрированные источники по
// порядку; без источника — мгновенный обрыв (пустой поток).
function mockService () {
  const calls = []
  const pending = []
  return {
    calls,
    next (factory) { pending.push(factory) },
    watchApprovalRequests (signal) {
      calls.push(signal)
      const factory = pending.shift()
      if (factory === undefined) return (async function * () {})()
      return factory(signal)
    }
  }
}

// Управляемый источник кадров — двойник хостового watchApprovalRequests:
// push() отдаёт кадр, end() завершает генератор («обрыв»), store закрывает
// поток через abort.
function controllableSource () {
  let live
  return {
    factory: signal => {
      const queue = []
      let wake
      let ended = signal?.aborted === true
      const pump = () => { const resolve = wake; wake = undefined; resolve?.() }
      live = {
        push: frame => { queue.push(frame); pump() },
        end: () => { ended = true; pump() }
      }
      return (async function * () {
        if (ended) return
        signal?.addEventListener('abort', () => { ended = true; pump() }, { once: true })
        while (true) {
          if (queue.length > 0) yield queue.shift()
          else if (ended) return
          else await new Promise(resolve => { wake = resolve })
        }
      })()
    },
    push: frame => live?.push(frame),
    end: () => live?.end()
  }
}

// Поток готовых кадров с мгновенным концом после них — симуляция обрыва.
function breakingStream (frames) {
  return async function * (signal) {
    if (signal?.aborted === true) return
    for (const frame of frames) yield frame
  }
}

let passed = 0
async function check (name, callback) {
  await callback()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

await check('snapshot replaces the state, added/removed apply incrementally', async () => {
  const store = createApprovalStore({ reconnectDelayMs: 5 })
  const service = mockService()
  const source = controllableSource()
  service.next(source.factory)
  store.start(() => service)

  source.push({ type: 'snapshot', requests: [packet('a', 'root-1'), packet('b', 'root-2')] })
  await wait(0)
  assert.equal(store.count(), 2)

  source.push({ type: 'added', request: packet('c', 'root-1') })
  await wait(0)
  assert.equal(store.count(), 3)

  source.push({ type: 'removed', requestId: 'b' })
  await wait(0)
  assert.equal(store.count(), 2)
  assert.deepEqual(store.getForSession('root-2'), [])
  store.stop()
})

await check('getForSession filters packets by rootSessionId', async () => {
  const store = createApprovalStore({ reconnectDelayMs: 5 })
  const service = mockService()
  const source = controllableSource()
  service.next(source.factory)
  store.start(() => service)

  source.push({
    type: 'snapshot',
    requests: [packet('a', 'root-1'), packet('b', 'root-2'), packet('c', 'root-1')]
  })
  await wait(0)
  assert.deepEqual(store.getForSession('root-1').map(item => item.requestId), ['a', 'c'])
  assert.deepEqual(store.getForSession('root-2').map(item => item.requestId), ['b'])
  assert.deepEqual(store.getForSession('ghost'), [])
  assert.equal(store.count(), 3)
  store.stop()
})

await check('subscribe is notified per applied frame; unsubscribe and stop silence it', async () => {
  const store = createApprovalStore({ reconnectDelayMs: 5 })
  const service = mockService()
  const source = controllableSource()
  service.next(source.factory)
  store.start(() => service)

  let notified = 0
  const unsubscribe = store.subscribe(() => { notified += 1 })
  source.push({ type: 'snapshot', requests: [packet('a', 'root-1')] })
  source.push({ type: 'added', request: packet('b', 'root-1') })
  source.push({ type: 'removed', requestId: 'a' })
  await wait(0)
  assert.equal(notified, 3)

  unsubscribe()
  source.push({ type: 'added', request: packet('c', 'root-1') })
  await wait(0)
  assert.equal(notified, 3, 'unsubscribed listener must not fire')
  assert.equal(store.count(), 2)

  // stop() снимает подписчиков: поздние кадры никому не сообщаются.
  store.subscribe(() => { notified += 10 })
  store.stop()
  source.push({ type: 'added', request: packet('d', 'root-1') })
  await wait(0)
  assert.equal(notified, 3, 'stop() must clear subscribers and stop applying frames')
})

await check('a broken stream resubscribes after the pause with a fresh snapshot', async () => {
  const store = createApprovalStore({ reconnectDelayMs: 100 })
  const service = mockService()
  service.next(breakingStream([{ type: 'snapshot', requests: [packet('a', 'root-1')] }]))
  const second = controllableSource()
  service.next(second.factory)
  store.start(() => service)
  await wait(0)
  assert.equal(store.count(), 1, 'frames of the broken stream must be applied')
  assert.equal(service.calls.length, 1)

  // Обрыв обработан: переподписка НЕ мгновенная — только после паузы.
  await wait(15)
  assert.equal(service.calls.length, 1, 'reconnect must wait for the pause')

  await wait(250)
  assert.equal(service.calls.length, 2, 'the stream must be re-subscribed after the pause')
  second.push({ type: 'snapshot', requests: [packet('b', 'root-1')] })
  await wait(0)
  assert.equal(store.count(), 1, 'the reconnect snapshot must replace the stale state')
  assert.deepEqual(store.getForSession('root-1').map(item => item.requestId), ['b'])
  store.stop()
})

await check('stop() aborts the active stream and halts re-subscription', async () => {
  const store = createApprovalStore({ reconnectDelayMs: 5 })
  const service = mockService()
  const source = controllableSource()
  service.next(source.factory)
  store.start(() => service)
  await wait(0)
  assert.equal(service.calls.length, 1)
  assert.equal(service.calls[0].aborted, false)

  store.stop()
  await wait(0)
  assert.equal(service.calls[0].aborted, true, 'stop must abort the active stream')
  const settled = service.calls.length
  await wait(30)
  assert.equal(service.calls.length, settled, 'no re-subscription after stop')
})

console.log(`${passed} approval-store tests passed`)
