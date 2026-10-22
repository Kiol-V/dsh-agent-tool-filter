// fix-invalid-js-expr.mjs — чинит невалидные `!!js !expr` в профильном patch.
// Проблема: YAML-парсер видит `!!js !ctx.get(...)` как «двойной тег» (duplication
// of a tag property) и падает на старте. Лечение: выражение в кавычки.
//
// Запуск:
//   node fix-invalid-js-expr.mjs <путь к cordis.patch.yml>
//
// Перед правкой создаётся копия <файл>.bak-<метка>.
import { readFile, writeFile, copyFile } from 'node:fs/promises'

const target = process.argv[2]
if (!target) {
  console.error('usage: node fix-invalid-js-expr.mjs <cordis.patch.yml>')
  process.exit(1)
}

const text = await readFile(target, 'utf8')
const backup = `${target}.bak-${Date.now().toString(36)}`
await copyFile(target, backup)
console.log(`backup: ${backup}`)

// Паттерн: `!!js ` + выражение, начинающееся с `!`, не в кавычках → оборачиваем.
// Уже экранированные (`!!js "!...`) не трогаются.
const fixed = text.replace(
  /^(\s*disabled:\s*!!js\s+)(!ctx\.get\([^)\n]+\))/gm,
  '$1"$2"'
)

if (fixed === text) {
  console.log('no changes — file already valid')
} else {
  await writeFile(target, fixed, 'utf8')
  const changed = text.split('\n').filter((line, i) => line !== fixed.split('\n')[i]).length
  console.log(`fixed ${changed} line(s)`)
}

// Верификация: незаэкранированных `!!js !` оставаться не должно.
const stillBroken = fixed.split('\n').some(line => /!!js\s+![^"'\s]/.test(line))
if (stillBroken) {
  console.error('still has unquoted !!js ! expressions')
  process.exit(2)
}
console.log('OK')
