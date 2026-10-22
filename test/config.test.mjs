// Тесты lib/config.mjs — нормализация конфигурации, профилей и матрицы.
// Запуск: node --test test/ (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_PROFILES,
  DEFAULT_PRESETS,
  RESERVED_NAMES,
  normalizeConfig,
  normalizeProfile
} from '../lib/config.mjs'

test('normalizeConfig: без конфига — безопасные дефолты', () => {
  const cfg = normalizeConfig(undefined)
  assert.equal(cfg.enabled, true)
  assert.deepEqual(cfg.presets, {})
  assert.deepEqual(Object.keys(cfg.profiles).sort(), Object.keys(DEFAULT_PROFILES).sort())
  assert.deepEqual(cfg.notes, [])
})

test('normalizeConfig: enabled false', () => {
  const cfg = normalizeConfig({ enabled: false })
  assert.equal(cfg.enabled, false)
})

test('normalizeConfig: пустая матрица — не фильтровать нигде', () => {
  const cfg = normalizeConfig({ presets: {} })
  assert.deepEqual(cfg.presets, {})
})

test('normalizeConfig: пользовательская матрица проверяется по профилям', () => {
  const cfg = normalizeConfig({
    presets: { 'tool-filtered': 'balanced', cordis: 'custom-a' },
    profiles: { 'custom-a': { mode: 'deny', tools: ['web_search'] } }
  })
  assert.deepEqual(cfg.presets, { 'tool-filtered': 'balanced', cordis: 'custom-a' })
})

test('normalizeConfig: неизвестный профиль в матрице — связка пропущена с заметкой', () => {
  const cfg = normalizeConfig({ presets: { cordis: 'no-such-profile' } })
  assert.deepEqual(cfg.presets, {})
  assert.equal(cfg.notes.length, 1)
  assert.match(cfg.notes[0], /no-such-profile/)
})

test('normalizeConfig: пустое имя профиля в матрице — заметка', () => {
  const cfg = normalizeConfig({ presets: { cordis: '  ' } })
  assert.deepEqual(cfg.presets, {})
  assert.equal(cfg.notes.length, 1)
})

test('normalizeConfig: пользовательский профиль переопределяет встроенный по имени', () => {
  const cfg = normalizeConfig({ profiles: { 'cordis-trim': { mode: 'deny', tools: ['web_search'] } } })
  assert.deepEqual(cfg.profiles['cordis-trim'], { mode: 'deny', tools: ['web_search'] })
})

test('normalizeConfig: битый профиль отбрасывается с заметкой, остальные живы', () => {
  const cfg = normalizeConfig({ profiles: { bad: { mode: 'nope', tools: [] }, good: { mode: 'deny', tools: ['web_search'] } } })
  assert.equal(cfg.profiles.bad, undefined)
  assert.deepEqual(cfg.profiles.good.tools, ['web_search'])
  assert.equal(cfg.notes.length, 1)
})

test('normalizeConfig: неверный тип profiles/presets — ошибка', () => {
  assert.throws(() => normalizeConfig({ profiles: [] }), /profiles/)
  assert.throws(() => normalizeConfig({ presets: 'all' }), /presets/)
})

test('normalizeProfile: дефолтный режим deny', () => {
  const profile = normalizeProfile({ tools: ['web_search'] })
  assert.equal(profile.mode, 'deny')
  assert.deepEqual(profile.tools, ['web_search'])
})

test('normalizeProfile: режим allow', () => {
  const profile = normalizeProfile({ mode: 'allow', tools: ['read'] })
  assert.equal(profile.mode, 'allow')
})

test('normalizeProfile: неверный режим — ошибка', () => {
  assert.throws(() => normalizeProfile({ mode: 'hide', tools: [] }), /mode/)
})

test('normalizeProfile: glob и run_code отклоняются', () => {
  assert.throws(() => normalizeProfile({ tools: ['team_task_*'] }), /glob/)
  assert.throws(() => normalizeProfile({ tools: RESERVED_NAMES }), /зарезервированный/)
})

test('normalizeProfile: дубли и пустые имена схлопываются, порядок сохраняется', () => {
  const profile = normalizeProfile({ tools: [' web_search ', '', 'web_fetch', 'web_search'] })
  assert.deepEqual(profile.tools, ['web_search', 'web_fetch'])
})

test('normalizeProfile: не-объект — ошибка', () => {
  assert.throws(() => normalizeProfile(null), /профиль/)
  assert.throws(() => normalizeProfile('deny'), /профиль/)
})

test('normalizeConfig: debugLog — тумблер файловой диагностики, по умолчанию выкл', () => {
  assert.equal(normalizeConfig({}).debugLog, false)
  assert.equal(normalizeConfig({ debugLog: true }).debugLog, true)
  assert.equal(normalizeConfig({ debugLog: false }).debugLog, false)
})

test('normalizeConfig: debugLog не-boolean — ошибка', () => {
  assert.throws(() => normalizeConfig({ debugLog: 'yes' }), /debugLog/)
})

test('DEFAULT_PRESETS: дефолтная матрица пустая — установка ничего не фильтрует', () => {
  assert.deepEqual(DEFAULT_PRESETS, {})
})
