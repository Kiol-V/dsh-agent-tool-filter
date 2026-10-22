// serializer.test.mjs — форма insert-строки профильного patch (персистентность копии пресета).
// Золотой эталон: форма строки — контракт с диалектом Loader; кривая форма роняла
// композицию конфига на старте DSH (инцидент 2026-10-16: insert как mapping вместо
// sequence → data.push(...insert) на не-итерабельном → падение профиля).
import assert from 'node:assert/strict'

import { findInsertRowItem, findRowItem, removeRowItem, serializeInsertRow } from '../lib/serializer.mjs'

const text = serializeInsertRow({
  id: 'preset-my-copy',
  name: '@deepseek-ai/dsh-agent-preset',
  config: {
    id: 'my-copy',
    name: 'My Copy',
    description: 'Копия: "quoted" \\ slash',
    order: 1,
    plugins: [
      { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: { __jsExpr: "process.platform !== 'win32'" } },
      { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { flags: ['a', 'b'], nested: { deep: true, none: null, skip: undefined } } }
    ]
  }
})

const expected = [
  '- insert:',
  '    - id: "preset-my-copy"',
  '      name: "@deepseek-ai/dsh-agent-preset"',
  '      config:',
  '        id: "my-copy"',
  '        name: "My Copy"',
  '        description: "Копия: \\"quoted\\" \\\\ slash"',
  '        order: 1',
  '        plugins:',
  '          - id: "tool-pwsh"',
  '            name: "@deepseek-ai/dsh-tool-pwsh"',
  "            disabled: !!js process.platform !== 'win32'",
  '          - id: "tool-fs"',
  '            name: "@deepseek-ai/dsh-tool-fs"',
  '            config:',
  '              flags:',
  '                - "a"',
  '                - "b"',
  '              nested:',
  '                deep: true',
  '                none: null',
  ''
].join('\n')

assert.equal(text, expected, 'insert row must match the Loader dialect exactly (golden shape)')

// Страховка причине инцидента: значение insert: — ОБЯЗАТЕЛЬНО элемент последовательности.
assert.ok(text.split('\n')[1].startsWith('    - id:'), 'insert value must be a sequence item (leading "- ")')

// Хирургия строк: поиск/удаление элемента по id, хвост файла и соседи не задеты.
const patch = ['# comment', '- id: other', '  name: x', '', text.trimEnd(), ''].join('\n')
const found = findRowItem(patch, 'preset-my-copy')
assert.ok(found, 'row item must be found by its id')
assert.ok(found.text.startsWith('- insert:'), 'found item must be the insert block')
const cut = removeRowItem(patch, 'preset-my-copy')
assert.ok(!cut.includes('preset-my-copy'), 'removed item must leave the text')
assert.ok(cut.includes('# comment'), 'comments must survive')
assert.ok(cut.includes('- id: other'), 'other rows must survive')
assert.equal(findRowItem(cut, 'preset-my-copy'), null, 'removed row must no longer be found')
assert.equal(removeRowItem(cut, 'preset-my-copy'), null, 'double removal must report null')

// Plain-строка (override базового) — НЕ объявление: удаление и deletable-признак её не трогают.
const overridePatch = ['# comment', '- id: preset-ptc', '  name: "@deepseek-ai/dsh-agent-preset"', '  config:', '    description: edited', ''].join('\n')
assert.ok(findRowItem(overridePatch, 'preset-ptc'), 'plain row is findable as a row item')
assert.equal(findInsertRowItem(overridePatch, 'preset-ptc'), null, 'plain row is NOT an insert declaration')
assert.equal(removeRowItem(overridePatch, 'preset-ptc'), null, 'plain override row must not be removable')
assert.ok(overridePatch.includes('preset-ptc'), 'plain override must survive a refused removal')

// Регресс 2026-10-17: `!!js !expr` (отрицание) обязан писаться в кавычках, иначе
// YAML-парсер видит «двойной тег» (duplication of a tag property) и падает на старте.
const jsRow = serializeInsertRow({
  id: 'preset-jsexpr',
  name: '@deepseek-ai/dsh-agent-preset',
  config: {
    id: 'jsexpr',
    plugins: [
      { id: 'tool-a', name: 'x', disabled: { __jsExpr: "!ctx.get('profileContext')" } },
      { id: 'tool-b', name: 'x', disabled: { __jsExpr: "process.platform === 'win32'" } }
    ]
  }
})
assert.ok(jsRow.includes('disabled: !!js "!ctx.get(\'profileContext\')"'), `negated !!js must be quoted, got: ${jsRow}`)
assert.ok(jsRow.includes("disabled: !!js process.platform === 'win32'"), 'plain !!js must stay unquoted')

console.log('serializer: PASS')
