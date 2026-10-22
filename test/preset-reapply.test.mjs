// Тесты повторного применения фильтра при позднем выборе пресета.
// Запуск: node --test test/preset-reapply.test.mjs (из repo/).

import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../plugin.mjs'
import { readState } from '../lib/restriction.mjs'

const config = {
  behavior: 'auto',
  presets: { orchestrator: 'web-tools-deny' },
  profiles: { 'web-tools-deny': { mode: 'deny', tools: ['web_search', 'web_fetch'] } }
}

function makeHarness () {
  const roots = []
  const agents = new Map()
  const presetByAgent = new Map()
  const listeners = new Map()
  const restrictCalls = []
  const guardCalls = []
  const logs = []
  let disposedRestrictions = 0
  const tools = {
    restrict (filter) {
      restrictCalls.push(filter)
      return () => { disposedRestrictions += 1 }
    },
    guard (handler) {
      guardCalls.push(handler)
      return () => {}
    },
    schemas: () => [],
    view: () => ({ knownNames: ['web_search', 'web_fetch'], restrictableNames: ['web_search', 'web_fetch'] })
  }
  const ctx = {
    get (key) {
      if (key === 'agents') {
        return { roots: () => roots, list: () => roots, get: sessionId => agents.get(sessionId) }
      }
      if (key === 'agentPresets') {
        return { composedPreset: agentCtx => presetByAgent.get(agentCtx) }
      }
      if (key === 'tools') return tools
      return undefined
    },
    on (event, listener) {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
    logger: {
      info: message => logs.push(String(message)),
      warn: message => logs.push(String(message)),
      error: message => logs.push(String(message))
    }
  }
  const makeAgent = (id) => {
    const agent = { id, session: {}, ctx: { get: key => key === 'tools' ? tools : undefined } }
    agents.set(id, agent)
    return agent
  }
  const emit = (event, ...args) => listeners.get(event)?.(...args)
  return {
    ctx,
    roots,
    presetByAgent,
    restrictCalls,
    guardCalls,
    logs,
    makeAgent,
    emit,
    disposedRestrictions: () => disposedRestrictions
  }
}

async function start (harness) {
  return apply(harness.ctx, config)
}

test('late preset selection reapplies hide restriction using the original startup source', async () => {
  const h = makeHarness()
  const stop = await start(h)
  const agent = h.makeAgent('session-1')
  h.roots.push(agent)

  h.emit('agent/created', { agent, source: 'startup' })
  assert.equal(h.restrictCalls.length, 0)
  assert.ok(h.logs.some(line => line.includes('пресет не привязан, ждём agent-preset/selected')))

  h.presetByAgent.set(agent.ctx, 'orchestrator')
  h.emit('agent-preset/selected', 'session-1', 'orchestrator')
  assert.deepEqual(h.restrictCalls, [{ deny: ['web_search'] }, { deny: ['web_fetch'] }])
  assert.equal(h.guardCalls.length, 0)
  assert.ok(h.logs.some(line => line.includes('hide «web-tools-deny»') && line.includes('скрыто схем: 2')))
  stop?.()
})

test('unmapped selected preset clears the previous restriction without reapplying it', async () => {
  const h = makeHarness()
  const stop = await start(h)
  const agent = h.makeAgent('session-2')
  h.roots.push(agent)
  h.presetByAgent.set(agent.ctx, 'orchestrator')

  h.emit('agent/created', { agent, source: 'startup' })
  assert.equal(h.restrictCalls.length, 2)
  assert.ok(readState(agent))

  h.presetByAgent.set(agent.ctx, 'unmapped-preset')
  h.emit('agent-preset/selected', 'session-2', 'unmapped-preset')
  assert.equal(h.restrictCalls.length, 2)
  assert.equal(h.disposedRestrictions(), 2)
  assert.equal(readState(agent), undefined)
  assert.ok(h.logs.some(line => line.includes('unmapped-preset') && line.includes('orchestrator → web-tools-deny')))
  stop?.()
})

test('preset selection for an agent outside roots is ignored', async () => {
  const h = makeHarness()
  const stop = await start(h)
  const child = h.makeAgent('session-child')
  h.presetByAgent.set(child.ctx, 'orchestrator')

  h.emit('agent-preset/selected', 'session-child', 'orchestrator')
  assert.equal(h.restrictCalls.length, 0)
  assert.equal(h.guardCalls.length, 0)
  assert.equal(readState(child), undefined)
  stop?.()
})
