// Тесты lib/scan.mjs — сканирование tools и сверка профилей с реальным набором.
// Запуск: node test/scan.test.mjs (из корня проекта). Без внешних зависимостей.

import test from 'node:test'
import assert from 'node:assert/strict'

import { scanGlobalTools, classifyProfileTools } from '../lib/scan.mjs'

function ctxWith (names) {
  return {
    get (key) {
      if (key !== 'tools') return undefined
      return { schemas: () => names.map(name => ({ name })) }
    }
  }
}

test('scanGlobalTools: имена сортируются и очищаются от пустых', () => {
  const scan = scanGlobalTools(ctxWith(['web_search', '', 'read', null]))
  assert.equal(scan.available, true)
  assert.deepEqual(scan.names, ['read', 'web_search'])
})

test('scanGlobalTools: реестр недоступен — честное пометка available:false', () => {
  const scan = scanGlobalTools({ get: () => ({ schemas: () => { throw new Error('down') } }) })
  assert.equal(scan.available, false)
  assert.deepEqual(scan.names, [])
})

test('scanGlobalTools: сервис отсутствует — available:false без падения', () => {
  const scan = scanGlobalTools({ get: () => undefined })
  assert.equal(scan.available, false)
})

test('classifyProfileTools: подтверждённые и не найденные раскладываются', () => {
  const profiles = {
    trim: { mode: 'deny', tools: ['web_search', 'ghost_tool'] }
  }
  const { report, summary, notes } = classifyProfileTools(profiles, new Set(['web_search', 'read']))
  assert.deepEqual(report.trim.confirmed, ['web_search'])
  assert.deepEqual(report.trim.unconfirmed, ['ghost_tool'])
  assert.equal(summary.length, 1)
  assert.match(summary[0], /trim: 1 подтверждено\/1 не найдено/)
  assert.equal(notes.length, 1)
  assert.match(notes[0], /ghost_tool/)
  assert.match(notes[0], /❌/)
  assert.match(notes[0], /не найдено/)
})

test('classifyProfileTools: own-layer — ⚠ (существует, но restrict() не примет)', () => {
  const profiles = {
    team: { mode: 'deny', tools: ['read', 'team_task_create', 'ghost_tool'] }
  }
  const { report, summary, notes } = classifyProfileTools(
    profiles,
    new Set(['read', 'team_task_create']),
    new Set(['read'])
  )
  assert.deepEqual(report.team.confirmed, ['read'])
  assert.deepEqual(report.team.ownLayer, ['team_task_create'])
  assert.deepEqual(report.team.unconfirmed, ['ghost_tool'])
  assert.match(summary[0], /1 подтверждено\/1 не найдено\/1 own-layer/)
  assert.equal(notes.length, 2)
  assert.match(notes[0], /⚠ team_task_create/)
  assert.match(notes[1], /❌ ghost_tool/)
})

test('classifyProfileTools: не найденные имена НЕ выбрасываются из профиля', () => {
  const profiles = { trim: { mode: 'deny', tools: ['ghost_tool'] } }
  const { report } = classifyProfileTools(profiles, new Set())
  // классификация не мутирует профиль — имя остаётся в исходном списке
  assert.deepEqual(profiles.trim.tools, ['ghost_tool'])
  assert.deepEqual(report.trim.unconfirmed, ['ghost_tool'])
})

test('classifyProfileTools: все имена подтверждены — заметок нет', () => {
  const profiles = { trim: { mode: 'deny', tools: ['read', 'write'] } }
  const { notes, summary } = classifyProfileTools(profiles, new Set(['read', 'write']))
  assert.deepEqual(notes, [])
  assert.match(summary[0], /2 подтверждено\/0 не найдено/)
})

test('classifyProfileTools: несколько профилей — сводка по каждому', () => {
  const profiles = {
    a: { mode: 'deny', tools: ['read'] },
    b: { mode: 'allow', tools: ['ghost'] }
  }
  const { summary } = classifyProfileTools(profiles, new Set(['read']))
  assert.equal(summary.length, 2)
})
