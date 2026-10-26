// i18n.test.mjs — словари UI (RU/EN), резолв языка и поле language конфига.
import assert from 'node:assert/strict'
import { makeT, resolveLang } from '../lib/i18n.mjs'
import { normalizeConfig } from '../lib/config.mjs'

// resolveLang: явный язык побеждает; 'auto' — по локали платформы; иначе en.
assert.equal(resolveLang('ru', 'en'), 'ru')
assert.equal(resolveLang('en', 'ru'), 'en')
assert.equal(resolveLang('auto', 'ru-RU'), 'ru')
assert.equal(resolveLang('auto', 'zh'), 'en')
assert.equal(resolveLang('auto', undefined), 'en')

// makeT: словари RU/EN, параметры {name}, фолбэк на en, неизвестный ключ как есть.
const ru = makeT('ru')
const en = makeT('en')
assert.equal(ru('save'), 'Сохранить')
assert.equal(en('save'), 'Save')
assert.equal(ru('statusLine', { agents: 2, hidden: 3 }), 'Агентов с активной маской: 2 · скрыто схем: 3')
assert.equal(en('statusLine', { agents: 1, hidden: 0 }), 'Agents with an active mask: 1 · hidden schemas: 0')
assert.equal(makeT('de')('save'), 'Save', 'unknown language falls back to en')
assert.equal(en('noSuchKey'), 'noSuchKey', 'unknown key returns as-is')

// Паритет словарей панели апрува: каждая ключ-строка присутствует в RU и EN
// (отсутствие в ru маскировалось бы фолбэком на en — поэтому сверка с русским
// литералом, отсутствие в en — возвратом самого ключа).
const approvalStrings = {
  approvalPending: ['Ожидает разрешения', 'Awaiting approval'],
  approvalCounter: ['{k} из {n}', '{k} of {n}'],
  approvalPrevRequest: ['Предыдущий запрос', 'Previous request'],
  approvalNextRequest: ['Следующий запрос', 'Next request'],
  approvalDetails: ['Детали запроса на разрешение', 'Approval request details'],
  approvalRequest: ['Запрос:', 'Request:'],
  approvalWho: ['Кто запросил', 'Requested by'],
  approvalPreset: ['Пресет', 'Preset'],
  approvalSession: ['Сессия', 'Session'],
  approvalJustification: ['Обоснование', 'Justification'],
  approvalWhat: ['Что запрошено', 'What was requested'],
  approvalOperation: ['Операция', 'Operation'],
  approvalTargetAction: ['Целевое действие', 'Target action'],
  approvalAssignmentTitle: ['Задание субагента', 'Subagent assignment'],
  approvalAssignmentMissing: ['Задание не установлено', 'No assignment set'],
  approvalNoJustification: ['без обоснования', 'no justification'],
  approvalReject: ['Отклонить', 'Reject'],
  approvalAllowOnce: ['Разрешить (один раз)', 'Allow (once)']
}
for (const [key, [ruText, enText]] of Object.entries(approvalStrings)) {
  assert.equal(ru(key), ruText, `ru dictionary must carry ${key}`)
  assert.equal(en(key), enText, `en dictionary must carry ${key}`)
}
// Счётчик очереди: плейсхолдеры подставляются на обоих языках.
assert.equal(ru('approvalCounter', { k: 2, n: 5 }), '2 из 5')
assert.equal(en('approvalCounter', { k: 2, n: 5 }), '2 of 5')

// normalizeConfig: language нормализуется и валидируется.
assert.equal(normalizeConfig({}).language, 'auto')
assert.equal(normalizeConfig({ language: 'RU' }).language, 'ru')
assert.equal(normalizeConfig({ language: 'en' }).language, 'en')
assert.throws(() => normalizeConfig({ language: 'de' }), /language/)

console.log('i18n: PASS')
