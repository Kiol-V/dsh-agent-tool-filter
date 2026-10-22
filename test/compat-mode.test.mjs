// Тесты режима совместимости: детекция «грязной» истории, выбор режима, режим block (guard).
// Запуск: node test/compat-mode.test.mjs (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'

import { detectHiddenCalls, resolveMode } from '../lib/detect.mjs'
import { applyBlock, clearRestriction, readState } from '../lib/restriction.mjs'

const denyProfile = { mode: 'deny', tools: ['web_search', 'web_fetch'] }
const allowProfile = { mode: 'allow', tools: ['read'] }
const log = () => {}

function agentWith (messages) {
  return { id: 'a1', ctx: {}, session: { deriveMessages: () => messages } }
}

// --- detectHiddenCalls ---

test('detect: вызов скрываемого инструмента в content → true', () => {
  const agent = agentWith([
    { role: 'assistant', content: [{ type: 'reasoning', text: '...' }, { type: 'tool-call', id: 'c1', name: 'web_search' }] },
    { role: 'tool', content: [{ type: 'text', text: 'results' }] }
  ])
  assert.equal(detectHiddenCalls(agent, denyProfile), true)
})

test('detect: только видимые вызовы → false (чистая история)', () => {
  const agent = agentWith([
    { role: 'assistant', content: [{ type: 'tool-call', id: 'c1', name: 'glob' }] },
    { role: 'user', content: 'привет' }
  ])
  assert.equal(detectHiddenCalls(agent, denyProfile), false)
})

test('detect: пустая история → false', () => {
  assert.equal(detectHiddenCalls(agentWith([]), denyProfile), false)
})

test('detect: формат tool_calls (OpenAI-стиль) тоже ловится', () => {
  const agent = agentWith([
    { role: 'assistant', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'web_fetch', arguments: '{}' } }] }
  ])
  assert.equal(detectHiddenCalls(agent, denyProfile), true)
})

test('detect: allow-профиль — вызов ВНЕ списка скрываем, ВНУТРИ — нет', () => {
  const outside = agentWith([{ role: 'assistant', content: [{ type: 'tool-call', id: 'c', name: 'web_search' }] }])
  const inside = agentWith([{ role: 'assistant', content: [{ type: 'tool-call', id: 'c', name: 'read' }] }])
  assert.equal(detectHiddenCalls(outside, allowProfile), true)
  assert.equal(detectHiddenCalls(inside, allowProfile), false)
})

test('detect: нет API / ошибка → undefined (не паникуем)', () => {
  assert.equal(detectHiddenCalls({ id: 'x', ctx: {}, session: {} }, denyProfile), undefined)
  assert.equal(detectHiddenCalls({
    id: 'x', ctx: {}, session: { deriveMessages: () => { throw new Error('boom') } }
  }, denyProfile), undefined)
  assert.equal(detectHiddenCalls({
    id: 'x', ctx: {}, session: { deriveMessages: () => 'not-array' }
  }, denyProfile), undefined)
  assert.equal(detectHiddenCalls(undefined, denyProfile), undefined)
})

// --- resolveMode ---

test('resolveMode: behavior hide/block принудительно', () => {
  const dirty = agentWith([{ role: 'assistant', content: [{ type: 'tool-call', id: 'c', name: 'web_search' }] }])
  assert.equal(resolveMode({ behavior: 'hide' }, dirty, denyProfile, 'resume'), 'hide')
  assert.equal(resolveMode({ behavior: 'block' }, agentWith([]), denyProfile, 'startup'), 'block')
})

test('resolveMode: auto с детекцией', () => {
  const dirty = agentWith([{ role: 'assistant', content: [{ type: 'tool-call', id: 'c', name: 'web_search' }] }])
  const clean = agentWith([])
  assert.equal(resolveMode({ behavior: 'auto' }, dirty, denyProfile, undefined), 'block')
  assert.equal(resolveMode({ behavior: 'auto' }, clean, denyProfile, undefined), 'hide')
})

test('resolveMode: фолбэки при недоступной детекции (startup → hide, иначе → block)', () => {
  const unknown = { id: 'x', ctx: {}, session: {} }
  assert.equal(resolveMode({ behavior: 'auto' }, unknown, denyProfile, 'startup'), 'hide')
  assert.equal(resolveMode({ behavior: 'auto' }, unknown, denyProfile, 'resume'), 'block')
  assert.equal(resolveMode({ behavior: 'auto' }, unknown, denyProfile, undefined), 'block')
})

// --- applyBlock (режим block через tools.guard) ---

function blockAgent () {
  let guardCb = null
  let disposed = 0
  const tools = {
    guard (cb) {
      guardCb = cb
      return () => { disposed += 1 }
    },
    schemas: () => []
  }
  return {
    agent: { id: 'block-1', ctx: { get: (key) => (key === 'tools' ? tools : undefined) } },
    invoke: (exec) => guardCb(exec),
    disposedCount: () => disposed
  }
}

test('block: guard регистрируется, состояние хранит mode=block', () => {
  const h = blockAgent()
  applyBlock(h.agent, 'cordis', 'cordis-trim', denyProfile, log)
  const state = readState(h.agent)
  assert.equal(state.mode, 'block')
  assert.equal(state.disposers.length, 1)
  assert.equal(state.hidden, 0)
})

test('block: вызов скрываемого инструмента получает причину, видимый — undefined', () => {
  const h = blockAgent()
  applyBlock(h.agent, 'cordis', 'cordis-trim', denyProfile, log)
  const denied = h.invoke({ name: 'web_search' })
  assert.equal(typeof denied, 'string')
  assert.match(denied, /web_search/)
  assert.match(denied, /субагент/)
  assert.equal(h.invoke({ name: 'glob' }), undefined)
})

test('block: allow-профиль — запрещено всё вне списка', () => {
  const h = blockAgent()
  applyBlock(h.agent, 'p', 'prof', allowProfile, log)
  assert.equal(h.invoke({ name: 'read' }), undefined)
  assert.equal(typeof h.invoke({ name: 'web_search' }), 'string')
})

test('block: clearRestriction снимает guard', () => {
  const h = blockAgent()
  applyBlock(h.agent, 'p', 'prof', denyProfile, log)
  assert.equal(clearRestriction(h.agent), true)
  assert.equal(h.disposedCount(), 1)
  assert.equal(readState(h.agent), undefined)
})

test('block: guard недоступен — откат на скрытие схем (restrict, поимённо)', () => {
  let restrictCalled = 0
  const tools = {
    restrict () {
      restrictCalled += 1
      return () => {}
    },
    schemas: () => []
  }
  const agent = { id: 'fb', ctx: { get: (key) => (key === 'tools' ? tools : undefined) } }
  applyBlock(agent, 'p', 'prof', denyProfile, log)
  assert.equal(restrictCalled, 2) // deny поимённый: 2 имени профиля → 2 вызова
  assert.equal(readState(agent).mode, 'deny')
})
