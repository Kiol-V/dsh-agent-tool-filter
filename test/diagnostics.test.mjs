// Тесты lib/diagnostics.mjs — валидация имён, статус агентов, пересканирование tools.
// Запуск: node --test test/ (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'

import { buildWarnings, buildWarningItems, validateNames, status, scanTools } from '../lib/diagnostics.mjs'
import { storeState } from '../lib/restriction.mjs'

function makeCtx ({ globalNames, agents = [] } = {}) {
  return {
    get (key) {
      if (key === 'tools') {
        return {
          schemas () {
            if (globalNames === undefined) throw new Error('registry down')
            return globalNames.map(name => ({ name }))
          }
        }
      }
      if (key === 'agents') return { list: () => agents }
      return undefined
    }
  }
}

const cfg = {
  enabled: true,
  presets: { 'tool-filtered': 'minimal-orchestrator' },
  profiles: {
    'minimal-orchestrator': { mode: 'deny', tools: ['web_search', 'ghost_tool'] }
  }
}

test('validateNames: известное имя молчит, неизвестное предупреждает', () => {
  const ctx = makeCtx({ globalNames: ['web_search', 'read'] })
  const warnings = validateNames(cfg, ctx)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /ghost_tool/)
  assert.match(warnings[0], /minimal-orchestrator/)
})

test('validateNames: все имена известны — пусто', () => {
  const ctx = makeCtx({ globalNames: ['web_search', 'ghost_tool'] })
  assert.deepEqual(validateNames(cfg, ctx), [])
})

test('validateNames: реестр недоступен — имена помечаются (честное предупреждение)', () => {
  const ctx = makeCtx({}) // schemas бросает
  const warnings = validateNames(cfg, ctx)
  assert.equal(warnings.length, 2)
})

test('validateNames: own-layer имена не варнятся по профилям (они в сводке палитры)', () => {
  const ctx = {
    get (key) {
      if (key === 'tools') return { view: () => ({ knownNames: ['read', 'team_x'], restrictableNames: ['read'] }) }
      return undefined
    }
  }
  const ownCfg = { profiles: { p: { mode: 'deny', tools: ['team_x'] } } }
  assert.deepEqual(validateNames(ownCfg, ctx), [], 'uncontrollable names are not profile problems')
})

test('buildWarnings: ⚠ «нельзя отключить» сводкой по палитре + ❌ «не найдено» по-именно', () => {
  const ctx = makeCtx({ globalNames: ['web_search'] })
  const warnings = buildWarnings(
    { profiles: { custom: { mode: 'deny', tools: ['ghost_tool'] } } },
    ctx,
    ['run_code', 'team_x']
  )
  assert.equal(warnings.length, 2, `got: ${JSON.stringify(warnings)}`)
  assert.match(warnings[0], /⚠ нельзя отключить \(2\): run_code, team_x/)
  assert.match(warnings[1], /❌ ghost_tool/)
  assert.match(warnings[1], /custom/)
})

test('buildWarningItems: ❌-варн несёт имя и профили (кнопка «Убрать имя из профиля»)', () => {
  const ctx = makeCtx({ globalNames: ['web_search'] })
  const items = buildWarningItems(
    { profiles: { custom: { mode: 'deny', tools: ['ghost_tool'] } } },
    ctx,
    ['run_code']
  )
  assert.equal(items.length, 2, `got: ${JSON.stringify(items)}`)
  assert.equal(items[0].type, 'locked')
  assert.equal(items[1].type, 'unknown')
  assert.equal(items[1].tool, 'ghost_tool')
  assert.deepEqual(items[1].profiles, ['custom'])
  assert.match(items[1].text, /❌ ghost_tool/)
  assert.deepEqual(
    buildWarnings({ profiles: { custom: { mode: 'deny', tools: ['ghost_tool'] } } }, ctx, ['run_code']),
    items.map(item => item.text),
    'string form must derive from items'
  )
})

test('status: агенты с состоянием попадают в отчёт, disposers не утекают', () => {
  const agent = { id: 'a1', ctx: {} }
  storeState(agent, { presetId: 'cordis', profileName: 'cordis-trim', mode: 'deny', applied: 2, hidden: 2, skipped: [], disposers: [() => {}], at: 'now' })
  const plain = { id: 'a2', ctx: {} }
  const ctx = makeCtx({ globalNames: [], agents: [agent, plain] })
  const out = status(cfg, ctx)
  assert.equal(out.agents.length, 1)
  assert.equal(out.agents[0].id, 'a1')
  assert.equal(out.agents[0].hidden, 2)
  assert.equal('disposers' in out.agents[0], false)
  assert.deepEqual(out.presets, cfg.presets)
})

test('status: список агентов недоступен — пустой список без падения', () => {
  const ctx = { get: () => ({ list: () => { throw new Error('down') } }) }
  const out = status(cfg, ctx)
  assert.deepEqual(out.agents, [])
})

test('status: debugLogPath — env ATF_DEBUG_LOG → дефолт <DSH_HOME>/logs', () => {
  const ctx = makeCtx({ globalNames: [] })
  const previousEnv = process.env.ATF_DEBUG_LOG
  const previousHome = process.env.DSH_HOME
  try {
    process.env.ATF_DEBUG_LOG = path.join('C:', 'tmp', 'custom-atf.log')
    assert.equal(status(cfg, ctx).debugLogPath, path.join('C:', 'tmp', 'custom-atf.log'))
    delete process.env.ATF_DEBUG_LOG
    process.env.DSH_HOME = path.join('C:', 'home-test')
    assert.equal(status(cfg, ctx).debugLogPath, path.join('C:', 'home-test', 'logs', 'agent-tool-filter-debug.log'))
  } finally {
    if (previousEnv === undefined) delete process.env.ATF_DEBUG_LOG
    else process.env.ATF_DEBUG_LOG = previousEnv
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
  }
})

test('scanTools: отсортированные имена + предупреждения', () => {
  const ctx = makeCtx({ globalNames: ['web_search', 'ghost_tool', 'read'] })
  const out = scanTools(cfg, ctx)
  assert.deepEqual(out.tools, ['ghost_tool', 'read', 'web_search'])
  assert.deepEqual(out.warnings, [])
})

test('scanTools: реестр недоступен — пустой список', () => {
  const out = scanTools(cfg, makeCtx({}))
  assert.deepEqual(out.tools, [])
})
