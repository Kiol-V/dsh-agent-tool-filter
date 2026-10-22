// verify-yaml.mjs — синтаксическая валидация профильного cordis.patch.yml через
// YAML-парсер DSH. Тег `!!js` — диалект Loader, обычный YAML-парсер его не знает;
// для проверки синтаксиса `!!js ` заменяется на пустоту (выражение становится
// обычным скаляром). Ловит битые отступы, дубли ключей, невалидные скаляры и т.п.
//
// Запуск:
//   node verify-yaml.mjs <путь к cordis.patch.yml> [путь к профилю DSH]
//
// Парсер `yaml` ищется: (1) в node_modules указанного профиля, (2) в node_modules
// рядом со скриптом/текущим каталогом. Если не найден — укажите каталог профиля
// вторым аргументом или установите `yaml` (npm i yaml).
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'

const target = process.argv[2]
const profileDir = process.argv[3]
if (!target) {
  console.error('usage: node verify-yaml.mjs <cordis.patch.yml> [profileDir]')
  process.exit(1)
}

function loadYaml () {
  const candidates = []
  if (profileDir) candidates.push(path.join(profileDir, 'package.json'))
  candidates.push(path.join(process.cwd(), 'package.json'))
  for (const base of candidates) {
    if (!existsSync(base)) continue
    try {
      return createRequire(base)('yaml')
    } catch { /* пробуем следующий кандидат */ }
  }
  console.error('package "yaml" not found: pass a DSH profile dir as the second argument or run "npm i yaml"')
  process.exit(3)
}

const YAML = loadYaml()
const text = await readFile(target, 'utf8')
const cleaned = text.replace(/!!js\s+/g, '')
try {
  const parsed = YAML.parse(cleaned)
  const rows = Array.isArray(parsed) ? parsed.length : 0
  console.log(`OK: parsed ${rows} top-level row(s) (syntax valid, !!js-tag stripped for check)`)
} catch (err) {
  console.error(`YAML error: ${err.message}`)
  process.exit(2)
}
