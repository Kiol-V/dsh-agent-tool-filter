// Тесты lib/preset-display.mjs: резолв коротких display-текстов шиповых пресетов
// из локализационного словаря платформы (ключ → текст через translate-функцию).
// Гайд («Mode details»/«How to use») в копию не переносится — карточки Settings
// показывают его только для шиповых id (жёсткий словарь платформы, presetGuide).
import assert from 'node:assert/strict'
import { BUILT_IN_KEY_MAP, resolveCopyDisplay, resolvePresetDisplay } from '../lib/preset-display.mjs'

const DICT = {
  presetStandardName: 'Standard mode',
  presetStandardDescription: 'Work with code, files, and information.'
}
const t = key => DICT[key] ?? key

// 1. Короткий display: name + description, без разделов гайда.
assert.deepEqual(
  resolvePresetDisplay(t, 'standard', { name: 'standard' }),
  { name: 'Standard mode', description: 'Work with code, files, and information.' }
)

// 2. Кастомный id — словарь неприменим (вызывающий берёт опубликованные метаданные).
assert.equal(resolvePresetDisplay(t, 'orchestrator', { name: 'Оркестратор' }), undefined)

// 3. Пресет со своим именем владеет своей копией (семантика isBuiltInPreset).
assert.equal(resolvePresetDisplay(t, 'standard', { name: 'Renamed standard' }), undefined)

// 4. Частичный словарь — резолвится только то, что есть.
assert.deepEqual(
  resolvePresetDisplay(key => ({ presetStandardName: 'Std' })[key] ?? key, 'standard', { name: 'standard' }),
  { name: 'Std' }
)

// 5. Словарь ничего не отдаёт — undefined; t не функция — undefined.
assert.equal(resolvePresetDisplay(key => key, 'standard', { name: 'standard' }), undefined)
assert.equal(resolvePresetDisplay(undefined, 'standard', { name: 'standard' }), undefined)

// 6. Модуль хранит только КЛЮЧИ словаря, не тексты (анти-дрейф при обновлении DSH).
assert.deepEqual(Object.keys(BUILT_IN_KEY_MAP), ['standard', 'ptc', 'minimal', 'cordis'])
for (const [id, keys] of Object.entries(BUILT_IN_KEY_MAP)) {
  for (const [field, key] of Object.entries(keys)) {
    assert.ok(/^preset[A-Z]/.test(key), `${id}.${field} must be a dictionary key, got: ${key}`)
    assert.ok(!key.includes(' '), `${id}.${field} must be a key, not text`)
  }
}

// 8. resolveCopyDisplay: кастомные берут опубликованные метаданные из presetInfo
// (жалоба 2026-10-17: описание кастомного пресета не копировалось), шиповые — словарь.
assert.deepEqual(
  resolveCopyDisplay(t, 'orchestrator', { name: 'Оркестратор', description: 'Управление задачами' }),
  { name: 'Оркестратор', description: 'Управление задачами' },
  'custom preset copy must carry its published name and description'
)
assert.deepEqual(
  resolveCopyDisplay(t, 'тест', { name: 'тест', description: 'Копия standard' }),
  { description: 'Копия standard' },
  'name equal to id is not a published name'
)
assert.equal(resolveCopyDisplay(t, 'no-meta', { name: 'no-meta' }), undefined, 'no metadata — no display')
assert.deepEqual(
  resolveCopyDisplay(undefined, 'standard', { name: 'standard', description: 'fallback' }),
  { description: 'fallback' },
  'without the dictionary the published description is used'
)
assert.equal(
  resolveCopyDisplay(t, 'standard', { name: 'standard' })?.description,
  'Work with code, files, and information.',
  'built-ins still prefer the DSH dictionary'
)

console.log('preset-display: PASS')
