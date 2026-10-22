// Тесты lib/restriction.mjs — применение/снятие ограничений, disposers, счётчик скрытых.
// Мок tools.restrict симулирует платформу: неизвестные имена бросают, disposer снимает маску.
// Запуск: node --test test/ (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPLIED,
  applyRestriction,
  clearRestriction,
  readState,
  safeVisibleCount
} from '../lib/restriction.mjs'

function makeAgent ({ hiddenNames = new Set(), visibleCount = 10, throwSchemas = false, allowThrows = false } = {}) {
  const calls = []
  let disposed = 0
  const tools = {
    restrict (filter) {
      if (filter.allow && allowThrows) {
        throw new Error('allow rejected')
      }
      if (filter.deny && hiddenNames.has(filter.deny[0])) {
        throw new Error(`unknown global tool "${filter.deny[0]}"`)
      }
      calls.push(filter)
      return () => { disposed += 1 }
    },
    schemas () {
      if (throwSchemas) throw new Error('no schemas')
      return Array.from({ length: visibleCount }, (_, i) => ({ name: `tool-${i}` }))
    }
  }
  const agent = {
    id: 'agent-1',
    ctx: { get: (key) => (key === 'tools' ? tools : undefined) }
  }
  return { agent, calls, disposedCount: () => disposed }
}

const logLines = []
const log = (level, text) => logLines.push(`${level}:${text}`)

test('applyRestriction deny: поимённый вызов restrict для каждого имени', () => {
  const { agent, calls } = makeAgent()
  applyRestriction(agent, 'cordis', 'cordis-trim', { mode: 'deny', tools: ['web_search', 'web_fetch'] }, log)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], { deny: ['web_search'] })
  assert.deepEqual(calls[1], { deny: ['web_fetch'] })
  const state = readState(agent)
  assert.equal(state.applied, 2)
  assert.equal(state.profileName, 'cordis-trim')
  assert.equal(state.disposers.length, 2)
})

test('applyRestriction deny: неизвестное имя пропускается, остальные применяются', () => {
  const { agent, calls } = makeAgent({ hiddenNames: new Set(['ghost']) })
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search', 'ghost', 'web_fetch'] }, log)
  assert.equal(calls.length, 2)
  const state = readState(agent)
  assert.equal(state.applied, 2)
  assert.equal(state.skipped.length, 1)
  assert.match(state.skipped[0], /ghost/)
})

test('applyRestriction allow: один вызов restrict', () => {
  const { agent, calls } = makeAgent()
  applyRestriction(agent, 'p', 'prof', { mode: 'allow', tools: ['read', 'write'] }, log)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { allow: ['read', 'write'] })
  assert.equal(readState(agent).applied, 2)
})

test('applyRestriction allow: ошибка restrict — имя в skipped, состояние без масок', () => {
  const { agent, calls } = makeAgent({ allowThrows: true })
  applyRestriction(agent, 'p', 'prof', { mode: 'allow', tools: ['read'] }, log)
  assert.equal(calls.length, 0)
  const state = readState(agent)
  assert.equal(state.applied, 0)
  assert.equal(state.skipped.length, 1)
})

test('clearRestriction: disposers вызываются, состояние снимается', () => {
  const { agent, disposedCount } = makeAgent()
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search'] }, log)
  assert.equal(disposedCount(), 0)
  assert.equal(clearRestriction(agent), true)
  assert.equal(disposedCount(), 1)
  assert.equal(readState(agent), undefined)
})

test('clearRestriction: без состояния — false, ничего не падает', () => {
  const { agent } = makeAgent()
  assert.equal(clearRestriction(agent), false)
})

test('повторное применение: старое состояние перезаписывается', () => {
  const { agent, calls, disposedCount } = makeAgent()
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search'] }, log)
  clearRestriction(agent)
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_fetch'] }, log)
  assert.equal(calls.length, 2)
  assert.equal(disposedCount(), 1)
  assert.equal(readState(agent).applied, 1)
})

test('счётчик скрытых: разница schemas до/после', () => {
  let visibleCount = 10
  const tools = {
    restrict () {
      visibleCount -= 1
      return () => {}
    },
    schemas () {
      return Array.from({ length: visibleCount }, (_, i) => ({ name: `t${i}` }))
    }
  }
  const agent = { id: 'a', ctx: { get: () => tools } }
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['x', 'y'] }, log)
  assert.equal(readState(agent).hidden, 2)
})

test('счётчик скрытых: schemas недоступен — фолбэк на число применённых', () => {
  const { agent } = makeAgent({ throwSchemas: true })
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search', 'web_fetch'] }, log)
  assert.equal(readState(agent).hidden, 2)
})

test('нет tools-сервиса: предупреждение, состояние не создаётся', () => {
  const agent = { id: 'a', ctx: { get: () => undefined } }
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search'] }, log)
  assert.equal(readState(agent), undefined)
})

test('доступ к tools: get отдаёт undefined — работает свойство контекста', () => {
  let called = 0
  const tools = {
    restrict () { called += 1; return () => {} },
    schemas: () => []
  }
  const agent = {
    id: 'prop-agent',
    ctx: { get: () => undefined, tools }
  }
  applyRestriction(agent, 'p', 'prof', { mode: 'deny', tools: ['web_search'] }, log)
  assert.equal(called, 1)
  assert.equal(readState(agent).applied, 1)
})

test('safeVisibleCount: не массив — null', () => {
  assert.equal(safeVisibleCount({ schemas: () => 'nope' }), null)
  assert.equal(safeVisibleCount({}), null)
})

test('состояние живёт под Symbol.for — стабильно между модулями', () => {
  assert.equal(typeof APPLIED, 'symbol')
  assert.equal(APPLIED, Symbol.for('dsh-agent-tool-filter/applied'))
})
