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

// normalizeConfig: language нормализуется и валидируется.
assert.equal(normalizeConfig({}).language, 'auto')
assert.equal(normalizeConfig({ language: 'RU' }).language, 'ru')
assert.equal(normalizeConfig({ language: 'en' }).language, 'en')
assert.throws(() => normalizeConfig({ language: 'de' }), /language/)

console.log('i18n: PASS')
