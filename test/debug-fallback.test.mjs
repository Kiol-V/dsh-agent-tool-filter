// Регрессионные тесты логирования и фолбэка выбранного пресета.

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { apply } from '../plugin.mjs'
import { makeDebugLog, resolveLogPath } from '../lib/debuglog.mjs'
import { readState } from '../lib/restriction.mjs'

const config = {
  behavior: 'auto',
  presets: { orchestrator: 'web-tools-deny' },
  profiles: { 'web-tools-deny': { mode: 'deny', tools: ['web_search', 'web_fetch'] } }
}

function makeHarness ({ composedPreset = true, presetReturnsUndefined = false } = {}) {
  const roots = []
  const agents = new Map()
  const presetByAgent = new Map()
  const listeners = new Map()
  const restrictCalls = []
  const tools = {
    restrict (filter) {
      restrictCalls.push(filter)
      return () => {}
    },
    guard: () => () => {},
    schemas: () => [],
    view: () => ({ knownNames: ['web_search', 'web_fetch'], restrictableNames: ['web_search', 'web_fetch'] })
  }
  const ctx = {
    get (key) {
      if (key === 'agents') {
        return { roots: () => roots, list: () => roots, get: sessionId => agents.get(sessionId) }
      }
      if (key === 'agentPresets') {
        return { composedPreset: composedPreset ? agentCtx => (presetReturnsUndefined ? undefined : presetByAgent.get(agentCtx)) : undefined }
      }
      if (key === 'tools') return tools
      return undefined
    },
    on (event, listener) {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
    logger: { info: () => {}, warn: () => {}, error: () => {} }
  }
  const makeAgent = id => {
    const agent = { id, session: {}, ctx: { get: key => key === 'tools' ? tools : undefined } }
    agents.set(id, agent)
    return agent
  }
  return {
    ctx,
    roots,
    presetByAgent,
    restrictCalls,
    makeAgent,
    emit: (event, ...args) => listeners.get(event)?.(...args)
  }
}

async function start (harness) {
  return apply(harness.ctx, { ...config, presets: { ...config.presets }, profiles: { ...config.profiles } })
}

test('selected event preset is used when composedPreset returns undefined', async () => {
  const h = makeHarness({ presetReturnsUndefined: true })
  const stop = await start(h)
  const agent = h.makeAgent('session-fallback')
  h.roots.push(agent)

  h.emit('agent-preset/selected', 'session-fallback', 'orchestrator')
  assert.equal(readState(agent)?.presetId, 'orchestrator')
  assert.deepEqual(h.restrictCalls, [{ deny: ['web_search'] }, { deny: ['web_fetch'] }])
  stop?.()
})

test('composedPreset takes precedence over the event preset fallback', async () => {
  const h = makeHarness()
  const stop = await start(h)
  const agent = h.makeAgent('session-composed')
  h.roots.push(agent)
  h.presetByAgent.set(agent.ctx, 'orchestrator')

  h.emit('agent-preset/selected', 'session-composed', 'different-preset')
  assert.equal(readState(agent)?.presetId, 'orchestrator')
  stop?.()
})

test('debug logger appends timestamped lines to ATF_DEBUG_LOG', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'atf-debug-'))
  const filePath = path.join(directory, 'debug.log')
  const previous = process.env.ATF_DEBUG_LOG
  try {
    process.env.ATF_DEBUG_LOG = filePath
    makeDebugLog()('test', 'diagnostic message')
    const lines = readFileSync(filePath, 'utf8').trim().split(/\r?\n/)
    assert.equal(lines.length, 1)
    assert.match(lines[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \| test \| diagnostic message$/)
  } finally {
    if (previous === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previous
    rmSync(directory, { recursive: true, force: true })
  }
})

test('debug logger is disabled by default (option off, no env)', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'atf-debug-'))
  const filePath = path.join(directory, 'debug.log')
  const previous = process.env.ATF_DEBUG_LOG
  try {
    delete process.env.ATF_DEBUG_LOG
    makeDebugLog({ enabled: false, file: filePath })('test', 'silent message')
    assert.equal(existsSync(filePath), false)
  } finally {
    if (previous === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previous
    rmSync(directory, { recursive: true, force: true })
  }
})

test('debug logger defaults to <DSH_HOME>/logs/agent-tool-filter-debug.log', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'atf-home-'))
  const previousHome = process.env.DSH_HOME
  const previousEnv = process.env.ATF_DEBUG_LOG
  try {
    delete process.env.ATF_DEBUG_LOG
    process.env.DSH_HOME = home
    makeDebugLog({ enabled: true })('test', 'dsh home message')
    const filePath = path.join(home, 'logs', 'agent-tool-filter-debug.log')
    assert.equal(existsSync(filePath), true)
    const lines = readFileSync(filePath, 'utf8').trim().split(/\r?\n/)
    assert.equal(lines.length, 1)
    assert.match(lines[0], /dsh home message$/)
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    if (previousEnv === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previousEnv
    rmSync(home, { recursive: true, force: true })
  }
})

test('resolveLogPath: env overrides, default follows <DSH_HOME>/logs', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'atf-home-'))
  const previousHome = process.env.DSH_HOME
  const previousEnv = process.env.ATF_DEBUG_LOG
  try {
    process.env.ATF_DEBUG_LOG = path.join(home, 'custom.log')
    assert.equal(resolveLogPath(), path.join(home, 'custom.log'), 'env path wins')
    delete process.env.ATF_DEBUG_LOG
    process.env.DSH_HOME = home
    assert.equal(resolveLogPath(), path.join(home, 'logs', 'agent-tool-filter-debug.log'), 'default under DSH_HOME')
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    if (previousEnv === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previousEnv
    rmSync(home, { recursive: true, force: true })
  }
})

test('debug logger: option on writes to options.file, getter toggles live', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'atf-debug-'))
  const filePath = path.join(directory, 'debug.log')
  const previous = process.env.ATF_DEBUG_LOG
  try {
    delete process.env.ATF_DEBUG_LOG
    let enabled = true
    const dlog = makeDebugLog({ enabled: () => enabled, file: filePath })
    dlog('test', 'first message')
    enabled = false
    dlog('test', 'suppressed message')
    enabled = true
    dlog('test', 'second message')
    const lines = readFileSync(filePath, 'utf8').trim().split(/\r?\n/)
    assert.equal(lines.length, 2)
    assert.match(lines[0], /first message$/)
    assert.match(lines[1], /second message$/)
  } finally {
    if (previous === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previous
    rmSync(directory, { recursive: true, force: true })
  }
})
