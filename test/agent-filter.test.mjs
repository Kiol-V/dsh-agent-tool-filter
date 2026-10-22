// Тесты lib/agent-filter.mjs — обработка агентов: корневой/дети, пресет-матрица, hot-update.
// Моки имитируют ctx: agents.roots()/list(), agentPresets.composedPreset(), tools.restrict().
// Запуск: node --test test/ (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'

import { makeAgentFilter } from '../lib/agent-filter.mjs'
import { readState, clearRestriction } from '../lib/restriction.mjs'

function makeHarness () {
  const restrictCalls = []
  let disposals = 0
  const tools = {
    restrict (filter) {
      restrictCalls.push(filter)
      return () => { disposals += 1 }
    },
    schemas: () => []
  }
  const roots = [] // мутируемый: агенты добавляются после конструирования
  const presetByAgent = new Map()
  const ctx = {
    get (key) {
      if (key === 'agents') return { roots: () => roots, list: () => roots }
      if (key === 'agentPresets') return { composedPreset: (agentCtx) => presetByAgent.get(agentCtx) }
      if (key === 'tools') return tools
      return undefined
    }
  }
  const agent = (id) => ({
    id,
    ctx: { get: (key) => (key === 'tools' ? tools : undefined) }
  })
  return { ctx, agent, roots, presetByAgent, restrictCalls, disposals: () => disposals }
}

const cfg = {
  enabled: true,
  presets: { 'tool-filtered': 'minimal-orchestrator', cordis: 'cordis-trim' },
  profiles: {
    'minimal-orchestrator': { mode: 'deny', tools: ['web_search'] },
    'cordis-trim': { mode: 'deny', tools: ['web_search', 'web_fetch'] }
  }
}
const log = () => {}

test('handle: корневой агент с пресетом из матрицы — фильтр применяется', () => {
  const h = makeHarness()
  const a = h.agent('root-1')
  h.roots.push(a)
  h.presetByAgent.set(a.ctx, 'cordis')
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  assert.equal(h.restrictCalls.length, 2)
  assert.deepEqual(h.restrictCalls[0], { deny: ['web_search'] })
  assert.deepEqual(h.restrictCalls[1], { deny: ['web_fetch'] })
  const state = readState(a)
  assert.equal(state.presetId, 'cordis')
  assert.equal(state.profileName, 'cordis-trim')
  assert.equal(state.applied, 2)
})

test('handle: ребёнок (не в roots) не трогается — волки сохраняют набор', () => {
  const h = makeHarness()
  const parent = h.agent('root')
  const child = h.agent('child')
  h.roots.push(parent) // ребёнок НЕ в roots
  h.presetByAgent.set(child.ctx, 'cordis') // тот же пресет, что у родителя (composeFrom)
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(child)
  assert.equal(h.restrictCalls.length, 0)
  assert.equal(readState(child), undefined)
})

test('handle: пресет не в матрице — ничего не применяется', () => {
  const h = makeHarness()
  const a = h.agent('r')
  h.roots.push(a)
  h.presetByAgent.set(a.ctx, 'ptc') // пресета нет в матрице cfg
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  assert.equal(h.restrictCalls.length, 0)
})

test('handle: пресет неизвестен (composedPreset undefined) — ничего не применяется', () => {
  const h = makeHarness()
  const a = h.agent('r')
  h.roots.push(a)
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  assert.equal(h.restrictCalls.length, 0)
})

test('handle: повторный вызов снимает старые маски перед новыми (hot-update)', () => {
  const h = makeHarness()
  const a = h.agent('r')
  h.roots.push(a)
  h.presetByAgent.set(a.ctx, 'cordis')
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  handle(a)
  // 2 применения × 2 имени; disposers первого применения вызваны при повторе
  assert.equal(h.restrictCalls.length, 4)
  assert.equal(h.disposals(), 2)
})

test('handle: связка убрана из матрицы — ограничения снимаются с живого агента', () => {
  const h = makeHarness()
  const a = h.agent('r')
  h.roots.push(a)
  h.presetByAgent.set(a.ctx, 'cordis')
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  assert.ok(readState(a))
  // новая матрица без cordis — имитация смены конфига
  const cfg2 = { ...cfg, presets: { 'tool-filtered': 'minimal-orchestrator' } }
  const { handle: handle2 } = makeAgentFilter(h.ctx, cfg2, log)
  handle2(a)
  assert.equal(readState(a), undefined)
  assert.equal(h.disposals(), 2)
})

test('rootsOf: реестр недоступен — null, обработка молчит (fail-open)', () => {
  const h = makeHarness()
  const ctxDown = {
    get (key) {
      if (key === 'agents') return { roots: () => { throw new Error('down') } }
      return undefined
    }
  }
  const { handle, rootsOf } = makeAgentFilter(ctxDown, cfg, log)
  assert.equal(rootsOf(), null)
  const a = h.agent('x')
  handle(a)
  assert.equal(h.restrictCalls.length, 0)
})

test('жизненный цикл: clearRestriction снимает состояние и вызывает disposers', () => {
  const h = makeHarness()
  const a = h.agent('r')
  h.roots.push(a)
  h.presetByAgent.set(a.ctx, 'cordis')
  const { handle } = makeAgentFilter(h.ctx, cfg, log)
  handle(a)
  assert.equal(clearRestriction(a), true)
  assert.equal(h.disposals(), 2)
  assert.equal(readState(a), undefined)
})
