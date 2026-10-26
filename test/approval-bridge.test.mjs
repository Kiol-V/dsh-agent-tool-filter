// Тесты «моста апрува» субагентов (lib/approval-bridge.mjs).
// Запуск: node test/approval-bridge.test.mjs (из repo/).

import assert from 'node:assert/strict'

import { ARGUMENT_TTL_MS, createApprovalBridge } from '../lib/approval-bridge.mjs'

// Мок-харнесс: ctx.on регистрирует листенеры и возвращает off(),
// ctx.get('agents') — реестр агентов, now() инжектируется через state.clock.
function harness ({ enabled = true } = {}) {
  const listeners = new Map()
  const registry = new Map()
  const logs = []
  const debugLog = []
  const state = { enabled, clock: 0 }
  const ctx = {
    on (name, fn, opts) {
      const entry = { fn, opts }
      const list = listeners.get(name) ?? []
      list.push(entry)
      listeners.set(name, list)
      return () => {
        const current = listeners.get(name) ?? []
        const index = current.indexOf(entry)
        if (index !== -1) current.splice(index, 1)
      }
    },
    get (key) {
      if (key === 'agents') return { get: sessionId => registry.get(sessionId) }
      return undefined
    }
  }
  const bridge = createApprovalBridge({
    ctx,
    getConfig: () => ({ subagentEscalation: state.enabled }),
    log: (kind, text) => logs.push({ kind, text }),
    dlog: (kind, text) => debugLog.push({ kind, text }),
    now: () => state.clock
  })
  const first = name => (listeners.get(name) ?? [])[0]
  return {
    bridge,
    ctx,
    logs,
    debugLog,
    registry,
    state,
    register (agent) {
      registry.set(agent.id, agent)
      return agent
    },
    emitCreated: session => first('session/created')?.fn(session),
    emitPreExecute: (exec, next = () => 'passed-through') => first('tools/pre-execute')?.fn(exec, next),
    emitApproval: (req, next = () => 'next-called') => first('approval/request')?.fn(req, next),
    optionsOf: name => first(name)?.opts
  }
}

// Мок сессии: header (+ parentSession/agentPreset), append(), deriveMessages(), eventAt(), seq.
function session (id, options = {}) {
  const appended = []
  const events = options.events ?? []
  return {
    header: {
      id,
      ...(options.parentSession !== undefined ? { parentSession: options.parentSession } : {}),
      ...(options.preset !== undefined ? { agentPreset: options.preset } : {})
    },
    appended,
    seq: events.length,
    append (type, data) {
      appended.push({ type, data })
    },
    deriveMessages: () => options.messages ?? [],
    eventAt: index => events[index]
  }
}

// pre-execute вызова инструмента ребёнком.
function preExecute (childSession, overrides = {}) {
  return {
    callId: 'call-1',
    name: 'write',
    arguments: { path: 'notes.md' },
    agent: { id: childSession.header.id, session: childSession },
    ...overrides
  }
}

// approval/request от имени ребёнка.
function approvalRequest (childSession, overrides = {}) {
  return {
    agent: { id: childSession.header.id, session: childSession },
    toolName: 'write',
    callId: 'call-1',
    displayReason: { ru: 'Запись файла в рабочем дереве' },
    ...overrides
  }
}

let passed = 0
async function check (name, callback) {
  await callback()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

await check('toggle off: session/created of a child appends nothing', () => {
  const h = harness({ enabled: false })
  const child = session('session-child-01', { parentSession: 'session-root-01' })
  h.emitCreated(child)
  assert.equal(child.appended.length, 0)
  const root = session('session-root-01')
  h.emitCreated(root)
  assert.equal(root.appended.length, 0)
})

await check('toggle on: child gets approval/policy ask exactly once, root gets nothing', () => {
  const h = harness({ enabled: true })
  const child = session('session-child-02', { parentSession: 'session-root-02', preset: 'wolf-executor' })
  h.emitCreated(child)
  assert.equal(child.appended.length, 1)
  assert.deepEqual(child.appended[0], { type: 'approval/policy', data: { policy: 'ask' } })
  const root = session('session-root-02')
  h.emitCreated(root)
  assert.equal(root.appended.length, 0)
})

await check('pre-execute fills the argument map; a TTL-expired entry resolves to unavailable', async () => {
  const h = harness({ enabled: true })
  const child = session('session-child-03', { parentSession: 'session-root-03' })
  h.register({ id: 'session-root-03', session: session('session-root-03') })

  const passedThrough = h.emitPreExecute(preExecute(child, { callId: 'call-fresh' }))
  assert.equal(passedThrough, 'passed-through', 'pre-execute must call next()')

  const hold = h.emitApproval(approvalRequest(child, { callId: 'call-fresh' }))
  const list = h.bridge.listApprovalRequests()
  assert.equal(list.length, 1)
  assert.deepEqual(list[0].action.arguments, { path: 'notes.md' })
  assert.equal(await h.bridge.answerApprovalRequest(list[0].requestId, 'allow'), 'allowed-once')
  assert.equal(await hold, 'allowed-once')

  // Запись старше TTL: чистка при чтении, фолбэк-скан лога пуст → fail-closed.
  h.emitPreExecute(preExecute(child, { callId: 'call-stale' }))
  h.state.clock += ARGUMENT_TTL_MS
  const stale = await h.emitApproval(approvalRequest(child, { callId: 'call-stale' }))
  assert.equal(stale, 'unavailable')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
})

await check('approval/request from a root falls through to next(); child with toggle off too', async () => {
  const h = harness({ enabled: true })
  assert.deepEqual(h.optionsOf('approval/request'), { prepend: true }, 'waterfall listener must be prepended')

  const rootReq = approvalRequest(session('session-root-04'))
  assert.equal(await h.emitApproval(rootReq), 'next-called')

  const off = harness({ enabled: false })
  const child = session('session-child-04', { parentSession: 'session-root-04' })
  assert.equal(await off.emitApproval(approvalRequest(child)), 'next-called')
})

await check('grandchild escalation: root agent resolved, packet complete, allow and reject settle the hold', async () => {
  const h = harness({ enabled: true })
  const rootSession = session('session-root-05')
  const midSession = session('session-mid-05', { parentSession: 'session-root-05' })
  h.register({ id: 'session-mid-05', session: midSession })
  h.register({ id: 'session-root-05', session: rootSession })
  const child = session('session-child-05', {
    parentSession: 'session-mid-05',
    preset: 'wolf-executor',
    messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'Поправь README' }]
  })
  h.emitPreExecute(preExecute(child, { callId: 'call-allow' }))
  h.emitPreExecute(preExecute(child, { callId: 'call-reject', arguments: { path: 'other.md' } }))

  // allow: холд висит до ответа панели.
  const allowHold = h.emitApproval(approvalRequest(child, { callId: 'call-allow' }))
  const list = h.bridge.listApprovalRequests()
  assert.equal(list.length, 1)
  const packet = list[0]
  const shortId = child.header.id.slice(0, 8)
  assert.equal(packet.requestId, `approval-${shortId}-call-allow`)
  assert.equal(packet.rootSessionId, 'session-root-05')
  assert.equal(packet.agent.preset, 'wolf-executor')
  assert.equal(packet.agent.shortSessionId, shortId)
  assert.equal(packet.agent.assignment, 'Поправь README')
  assert.equal(packet.agent.assignmentFound, true)
  assert.equal(packet.action.toolName, 'write')
  assert.deepEqual(packet.action.arguments, { path: 'notes.md' })
  assert.equal(packet.justification, 'Запись файла в рабочем дереве')
  assert.ok(h.debugLog.some(entry => entry.text.includes('корень session-root-05')), 'root agent must be resolved via the parent chain')
  assert.equal(await h.bridge.answerApprovalRequest(packet.requestId, 'allow'), 'allowed-once')
  assert.equal(await allowHold, 'allowed-once')

  // reject: второй запрос того же ребёнка, justification фолбэком на reason.
  const rejectHold = h.emitApproval(approvalRequest(child, { callId: 'call-reject', displayReason: undefined, reason: 'опасная операция' }))
  const rejectPacket = h.bridge.listApprovalRequests()[0]
  assert.equal(rejectPacket.justification, 'опасная операция')
  assert.deepEqual(rejectPacket.action.arguments, { path: 'other.md' })
  assert.equal(await h.bridge.answerApprovalRequest(rejectPacket.requestId, 'reject'), 'rejected')
  assert.equal(await rejectHold, 'rejected')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
})

await check('missing arguments (empty map, no tool/call in the child log): unavailable without publication', async () => {
  const h = harness({ enabled: true })
  const child = session('session-child-06', { parentSession: 'session-root-06', events: [] })
  h.register({ id: 'session-root-06', session: session('session-root-06') })
  const result = await h.emitApproval(approvalRequest(child, { toolName: 'web_search', callId: 'call-ghost' }))
  assert.equal(result, 'unavailable')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
  assert.ok(!h.debugLog.some(entry => entry.text.includes('пакет опубликован')), 'no packet must be published')
})

await check('argument-map entry from a foreign session counts as missing (fail-closed)', async () => {
  const h = harness({ enabled: true })
  const childA = session('session-child-a', { parentSession: 'session-root-09' })
  const childB = session('session-child-b', { parentSession: 'session-root-09', events: [] })
  h.register({ id: 'session-root-09', session: session('session-root-09') })
  h.emitPreExecute(preExecute(childA, { callId: 'call-shared' }))
  // Чужая запись карты: B запрашивает тот же callId, в логе B события tool/call нет.
  const result = await h.emitApproval(approvalRequest(childB, { callId: 'call-shared' }))
  assert.equal(result, 'unavailable')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
  assert.ok(!h.debugLog.some(entry => entry.text.includes('пакет опубликован')), 'no packet must be published from a foreign map entry')
})

await check('abort before the answer removes the card and late answers report not-found', async () => {
  const h = harness({ enabled: true })
  const child = session('session-child-07', { parentSession: 'session-root-07' })
  h.register({ id: 'session-root-07', session: session('session-root-07') })
  h.emitPreExecute(preExecute(child))
  const controller = new AbortController()
  const hold = h.emitApproval(approvalRequest(child, { signal: controller.signal }))
  const [published] = h.bridge.listApprovalRequests()
  assert.ok(published !== undefined, 'packet must be pending before the abort')

  controller.abort()
  assert.equal(await hold, 'unavailable')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
  await assert.rejects(
    () => h.bridge.answerApprovalRequest(published.requestId, 'allow'),
    /не найден/
  )
})

await check('toggle off with a pending request: sync settles it as unavailable and drops the card', async () => {
  const h = harness({ enabled: true })
  const child = session('session-child-08', { parentSession: 'session-root-08' })
  h.register({ id: 'session-root-08', session: session('session-root-08') })
  h.emitPreExecute(preExecute(child))
  const hold = h.emitApproval(approvalRequest(child))
  assert.equal(h.bridge.listApprovalRequests().length, 1)

  h.state.enabled = false
  assert.equal(h.bridge.sync(), 1)
  assert.equal(await hold, 'unavailable')
  assert.equal(h.bridge.listApprovalRequests().length, 0)
})

await check('answerApprovalRequest rejects an unknown requestId and a bad decision without breaking', async () => {
  const h = harness({ enabled: true })
  await assert.rejects(
    () => h.bridge.answerApprovalRequest('approval-ghost-call', 'allow'),
    /не найден/
  )
  await assert.rejects(
    () => h.bridge.answerApprovalRequest('approval-ghost-call', 'maybe'),
    /decision/
  )
  assert.deepEqual(h.bridge.listApprovalRequests(), [])
  assert.equal(h.bridge.sync(), 0)
})

console.log(`${passed} approval-bridge tests passed`)
