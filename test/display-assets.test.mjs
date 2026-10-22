// Проверка ресурсов отображения и публикации пакета в Plugin Manager.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = relativePath => JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'))
const packageJson = readJson('package.json')

const icon = readFileSync(path.join(repoRoot, 'icon.svg'), 'utf8')
assert.match(icon, /<svg\b/, 'icon.svg must contain an SVG root element')
assert.match(icon, /\bviewBox=["']0 0 64 64["']/, 'icon.svg must use the 64×64 viewBox')
assert.match(icon, /<(?:path|rect|circle|polygon)\b/, 'icon.svg must contain drawable shapes')
assert.ok(Buffer.byteLength(icon, 'utf8') < 10 * 1024, 'icon.svg must be smaller than 10 KiB')

for (const language of ['en', 'ru']) {
  const locale = readJson(`locale/${language}.json`)
  assert.equal(typeof locale.meta?.title, 'string', `${language} metadata title must be a string`)
  assert.ok(locale.meta.title.trim(), `${language} metadata title must not be empty`)
  assert.equal(typeof locale.meta?.description, 'string', `${language} metadata description must be a string`)
  assert.ok(locale.meta.description.trim(), `${language} metadata description must not be empty`)
}

assert.equal(packageJson.icon, './icon.svg', 'manifest icon must point to the bundled SVG')
assert.equal(packageJson.exports['.'], './plugin.mjs', 'runtime root export must remain intact')
assert.equal(packageJson.exports['./client'], './lib/client.js', 'runtime client export must remain intact')
assert.equal(packageJson.exports['./cordis.patch.yml'], './cordis.patch.yml', 'runtime patch export must remain intact')
assert.equal(packageJson.exports['./locale/*.json'], './locale/*.json', 'locale export must be declared')
assert.equal(packageJson.exports['./icon'], './icon.svg', 'icon export must be declared')
assert.ok(packageJson.files.includes('icon.svg'), 'icon.svg must be packed')
assert.ok(packageJson.files.includes('locale/*.json'), 'locale JSON files must be packed')
assert.ok(existsSync(path.join(repoRoot, 'cordis.patch.yml')), 'cordis.patch.yml must exist')
assert.match(readFileSync(path.join(repoRoot, 'cordis.patch.yml'), 'utf8'), /agent-tool-filter/, 'bundle patch must contain agent-tool-filter')
assert.equal(packageJson.dsh?.bundle?.patch, './cordis.patch.yml', 'bundle patch must be declared')
assert.ok(packageJson.files.includes('cordis.patch.yml'), 'cordis.patch.yml must be packed')

console.log('display-assets: PASS')
