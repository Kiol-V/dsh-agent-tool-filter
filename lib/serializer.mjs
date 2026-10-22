// lib/serializer.mjs — сериализация insert-строки профильного patch в YAML-текст.
// Вставка идёт ДОПИСЫВАНИЕМ в конец файла: существующий текст (включая комментарии)
// не затрагивается. Формат строки повторяет платформенные объявления пресетов:
//
//   - insert:
//       - id: preset-<slug>
//         name: '<пакет объявления>'
//         config:
//           id: <slug>
//           ...
//
// Значения `!!js` (дисалект Loader, в памяти — {__jsExpr}) выводятся скаляром `!!js`.
// Важно: выражение ОБОРАЧИВАЕТСЯ в кавычки, если начинается с `!` или содержит
// YAML-опасные символы (иначе парсер видит «двойной тег»: `!!js !ctx.get(...)` →
// YAMLException: duplication of a tag property). Пример: `!ctx.get('profileContext')`
// обязан писаться как `!!js "!ctx.get('profileContext')"`.

function isJsExpr (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && typeof value.__jsExpr === 'string' && Object.keys(value).length === 1
}

function quote (text) {
  return '"' + String(text).replace(/[\\"\u0000-\u001f\u007f-\u009f]/g, ch => {
    if (ch === '"') return '\\"'
    if (ch === '\\') return '\\\\'
    return `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
  }) + '"'
}

// Экранирование выражения для `!!js`: если выражение начинается с `!` или содержит
// двоеточие-пробел / ` #` (комментарий) / перенос — оборачиваем в кавычки.
function emitJsExpr (expr) {
  const text = String(expr)
  const needsQuote = /^[!&*|>%@`"']/.test(text) || /:\s|\s#|[\n\r\t]/.test(text)
  return needsQuote ? `!!js ${quote(text)}` : `!!js ${text}`
}

// value → { inline } для скаляров/пустых контейнеров либо { lines } для блочных.
function emitValue (value, indent) {
  if (isJsExpr(value)) return { inline: emitJsExpr(value.__jsExpr) }
  if (value === null || value === undefined) return { inline: 'null' }
  if (typeof value === 'number' || typeof value === 'boolean') return { inline: String(value) }
  if (typeof value === 'string') return { inline: quote(value) }
  const pad = ' '.repeat(indent + 2)
  if (Array.isArray(value)) {
    if (value.length === 0) return { inline: '[]' }
    const lines = []
    for (const item of value) {
      const emitted = emitValue(item, indent + 2)
      if (emitted.inline !== undefined) lines.push(`${pad}- ${emitted.inline}`)
      else {
        // Каноничный вид: первый ключ элемента — на строке с маркером '-'.
        const [first, ...rest] = emitted.lines
        lines.push(`${pad}- ${first.trimStart()}`)
        lines.push(...rest)
      }
    }
    return { lines }
  }
  const keys = Object.keys(value).filter(key => value[key] !== undefined)
  if (keys.length === 0) return { inline: '{}' }
  const lines = []
  for (const key of keys) {
    const emitted = emitValue(value[key], indent + 2)
    if (emitted.inline !== undefined) lines.push(`${pad}${key}: ${emitted.inline}`)
    else {
      lines.push(`${pad}${key}:`)
      lines.push(...emitted.lines)
    }
  }
  return { lines }
}

// Текст insert-строки (без ведущего перевода строки; файл дополняется с новой строки).
// Форма — ПОСЛЕДОВАТЕЛЬНОСТЬ элементов под insert: (маркер '- ' обязателен —
// без него composeEntries получит объект вместо списка и роняет композицию на старте).
export function serializeInsertRow (row) {
  const entry = emitValue({ id: row.id, name: row.name, config: row.config }, 4)
  const [first, ...rest] = entry.lines
  return ['- insert:', `    - ${first.trimStart()}`, ...rest].join('\n') + '\n'
}

// Разбиение YAML-текста патча на верхнеуровневые элементы (каждый начинается с '- '
// в нулевой колонке). Возвращает [{ start, end, text }] — границы в символах текста.
export function splitTopLevelItems (text) {
  const items = []
  const lines = text.split('\n')
  let start = 0
  let current = []
  let offset = 0
  for (const line of lines) {
    if (/^- /.test(line) && current.length > 0) {
      items.push({ start, end: offset - 1, text: current.join('\n') })
      start = offset
      current = []
    }
    current.push(line)
    offset += line.length + 1
  }
  if (current.length > 0) items.push({ start, end: text.length, text: current.join('\n') })
  return items
}

// Верхнеуровневый элемент, объявляющий строку с заданным id (insert-обёртка или
// plain-строка). Сопоставление — по строке вида `id: <rowId>` в любом отступе.
export function findRowItem (text, rowId) {
  const escaped = rowId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^\\s*-?\\s*id:\\s*["']?${escaped}["']?\\s*$`, 'm')
  return splitTopLevelItems(text).find(item => pattern.test(item.text)) ?? null
}

// Объявление строки — только insert-обёртка. Plain-строка с тем же id — это
// override существующей строки (правки базовых пресетов через Settings пишутся
// именно так): строку она НЕ создаёт и удалению как custom не подлежит.
export function findInsertRowItem (text, rowId) {
  const escaped = rowId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^\\s*-?\\s*id:\\s*["']?${escaped}["']?\\s*$`, 'm')
  return splitTopLevelItems(text).find(item => item.text.startsWith('- insert:') && pattern.test(item.text)) ?? null
}

// Текст без insert-объявления строки rowId (хвостовые переводы строк вычищены).
export function removeRowItem (text, rowId) {
  const item = findInsertRowItem(text, rowId)
  if (item === null) return null
  let end = item.end
  while (end < text.length && text[end] === '\n') end += 1
  let start = item.start
  while (start > 0 && text[start - 1] === '\n') start -= 1
  return text.slice(0, start) + '\n' + text.slice(end)
}
