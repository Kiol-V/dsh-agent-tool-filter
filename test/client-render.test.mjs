// client-render.test.mjs — локальный смоук рендера клиентской карточки.
// Захватывает компонент из lib/client.js через фейковый ctx (apply → slots.register)
// и рендерит его через react-dom/server — ловит падения рендера до живого профиля.
// Язык UI по умолчанию — en (resolveLang без локали платформы); RU проверяется явно.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { makeT } from '../lib/i18n.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..')
const requireFromRepo = createRequire(path.join(REPO, 'package.json'))

const React = requireFromRepo('react')
const { renderToString } = requireFromRepo('react-dom/server')
const jsxRuntime = requireFromRepo('react/jsx-runtime')

// 1. Загружаем бандл как клиентский модуль: подменяем window.__ModuleLoader__ и require.
const captured = []
globalThis.window = {
  __ModuleLoader__: {
    load ({ id, factory }) {
      captured.push({ id, factory })
    }
  }
}
const bundleSource = readFileSync(path.join(REPO, 'lib', 'client.js'), 'utf8')
const moduleShim = { exports: {} }
const localRequire = (spec) => {
  if (spec === 'react') return React
  if (spec === 'react/jsx-runtime') return jsxRuntime
  if (spec === 'react-dom') return requireFromRepo('react-dom')
  if (spec === 'react-dom/client') return requireFromRepo('react-dom/client')
  throw new Error(`unexpected require: ${spec}`)
}
new Function('window', 'module', 'exports', 'require', bundleSource)(
  globalThis.window, moduleShim, moduleShim.exports, localRequire
)
assert.equal(captured.length, 1, 'bundle must register exactly one client module')
assert.equal(captured[0].id, 'dsh-agent-tool-filter')
const plugin = captured[0].factory(localRequire)
assert.equal(typeof plugin.apply, 'function', 'plugin exports apply')
assert.deepEqual(plugin.inject, ['remote', 'slots'], 'plugin exports inject')

// 2. Фейковый ctx: apply должен зарегистрировать слот plugins.row.config.
const calls = { mount: 0, register: null, injects: [] }
const fakeNs = {
  status: async () => ({
    ok: true,
    value: { enabled: true, language: 'auto', agents: [], presets: {}, profiles: {}, presetIds: [], tools: [], warnings: [] }
  })
}
const fakeCtx = {
  remote: {
    $mount: (contribution) => {
      calls.mount++
      assert.equal(contribution.package, 'dsh-agent-tool-filter')
      return Promise.resolve(() => {})
    },
    agentToolFilter: fakeNs
  },
  inject: (names, callback) => {
    calls.injects.push(names)
    return callback(fakeCtx)
  },
  get: (name) => (name === 'remote.agentToolFilter' ? fakeNs : undefined),
  effect: () => () => {},
  slots: {
    inject: (name, factory) => {
      assert.equal(name, 'plugins.row.config')
      return factory()
    },
    register: (descriptor, component) => {
      calls.register = { descriptor, component }
      return () => {}
    }
  }
}
plugin.apply(fakeCtx)
assert.ok(calls.register, 'apply registers the row-config seat')
assert.equal(calls.register.descriptor.name, 'plugins.row.config')
assert.equal(calls.register.descriptor.key, 'dsh-agent-tool-filter#agent-tool-filter')

// 2b. После $mount (микро-такты) namespace должен захватиться через ctx.inject.
await new Promise(resolve => setTimeout(resolve, 0))
assert.ok(calls.injects.some(names => names.includes('remote.agentToolFilter')), 'namespace captured via ctx.inject')
assert.ok(calls.injects.some(names => names.includes('locale')), 'locale face captured via ctx.inject')

// 3. Рендер страницы строки (view: 'page') — как это делает SlotOutlet.
const page = renderToString(React.createElement(calls.register.component, { view: 'page', form: undefined }))
const flat = page.replaceAll('<!-- -->', '')
assert.ok(flat.includes('Tool filtering'), `card must render (en default), got: ${page.slice(0, 400)}`)
assert.ok(flat.includes('Filtering enabled'), 'card must contain the enable toggle')
assert.ok(flat.includes('Refresh'), 'card must contain the refresh button')
assert.ok(flat.includes('Plugin UI language'), 'card must contain the language row')

// 4. Рендер summary-вида.
const summary = renderToString(React.createElement(calls.register.component, { view: 'summary' }))
assert.ok(summary.includes('Tool filtering settings'), `summary must render, got: ${summary.slice(0, 400)}`)

// 5. Рендер UI-секций (матрица, профили, редактор, скан) с реальными данными statusFull.
const sampleStatus = {
  enabled: true,
  presets: { cordis: 'cordis-trim' },
  profiles: {
    'cordis-trim': { mode: 'deny', tools: ['web_search', 'ghost'] },
    custom: { mode: 'allow', tools: ['read'] }
  },
  agents: [{ id: 'a1', hidden: 2 }],
  presetIds: ['cordis', 'ptc', 'default', 'my-copy'],
  presetInfo: {
    cordis: { rowId: 'preset-cordis', name: 'Cordis', deletable: false },
    ptc: { rowId: 'preset-ptc', name: 'PTC', deletable: false },
    default: { rowId: 'preset-default', name: 'Default', deletable: false },
    'my-copy': { rowId: 'preset-my-copy', name: 'My Copy', deletable: true }
  },
  tools: ['read', 'write', 'web_search'],
  lockedTools: ['run_code'],
  packs: [{ id: 'gradient', title: 'Градиент', description: 'шкала по силе ограничения', profiles: ['strict', 'balanced', 'soft'] }],
  report: { names: ['read', 'write', 'web_search'], groups: { controllable: ['read', 'write', 'web_search', 'ghost'], locked: ['run_code'] }, report: {}, summary: [], notes: [] },
  warnings: ['имя "ghost" не найдено среди глобальных tools']
}
const noop = () => {}
const flatOf = html => html.replaceAll('<!-- -->', '')

const matrix = flatOf(renderToString(React.createElement(plugin.MatrixSection, {
  status: sampleStatus, busy: false, onBind: noop, onUnbind: noop, onCopyPreset: noop, onDeletePreset: noop
})))
assert.ok(matrix.includes('cordis-trim'), 'matrix must list bindings')
assert.ok(matrix.includes('Bind'), 'matrix must offer binding')
assert.ok(matrix.includes('unbound'), 'unbound presets must show free status')
assert.ok(matrix.includes('Replace'), 'bound presets must offer rebinding')
assert.ok(matrix.includes('Copy'), 'rows must offer preset copy')
assert.ok(!matrix.includes('role="dialog"'), 'copy modal must be closed by default')
assert.ok(matrix.includes('— select a profile —'), 'unbound rows must offer an explicit profile choice')
assert.ok(matrix.includes('Built-in presets'), 'matrix must render the default-presets block')
assert.ok(matrix.includes('Custom presets'), 'matrix must render the custom-presets block')
assert.ok(matrix.indexOf('Built-in presets') < matrix.indexOf('Custom presets'), 'default block must come before the custom block')
assert.ok(matrix.indexOf('<code class="atf-code">my-copy</code>') > matrix.indexOf('Custom presets'), 'custom presets must land in the custom block')
assert.ok(matrix.indexOf('<code class="atf-code">cordis</code>') < matrix.indexOf('<code class="atf-code">default</code>'), 'default block must sort alphabetically')
assert.ok(matrix.indexOf('<code class="atf-code">default</code>') < matrix.indexOf('<code class="atf-code">ptc</code>'), 'default block must sort alphabetically')

// 5a. RU-словарь: те же секции на русском (локализация §8 спеки).
const matrixRu = flatOf(renderToString(React.createElement(plugin.MatrixSection, {
  status: sampleStatus, busy: false, t: makeT('ru'), onBind: noop, onUnbind: noop, onCopyPreset: noop, onDeletePreset: noop
})))
assert.ok(matrixRu.includes('Связать'), 'ru dictionary must render Russian labels')
assert.ok(matrixRu.includes('Дефолтные пресеты'), 'ru dictionary must render Russian block titles')

// 5b. Модалка копии пресета: dialog, имя, предпросмотр описания (§4.10).
const copyModal = flatOf(renderToString(React.createElement(plugin.PresetCopyModal, {
  preset: 'cordis', info: sampleStatus.presetInfo.cordis, t: makeT('en'),
  onCancel: noop, onConfirm: noop
})))
assert.ok(copyModal.includes('role="dialog"'), 'copy modal must render a dialog')
assert.ok(copyModal.includes('Copy name'), 'copy modal must offer the name field')
assert.ok(copyModal.includes('Description preview:'), 'copy modal must preview the description')

// Кастомный пресет: предпросмотр несёт его опубликованное имя и описание.
const customModal = flatOf(renderToString(React.createElement(plugin.PresetCopyModal, {
  preset: 'my-copy',
  info: { ...sampleStatus.presetInfo['my-copy'], description: 'My custom description' },
  t: makeT('en'),
  onCancel: noop, onConfirm: noop
})))
assert.ok(customModal.includes('Copy preset My Copy'), 'custom copy modal must preview the copy title')
assert.ok(customModal.includes('My custom description'), 'custom copy modal must preview the published description')

const profilesHtml = flatOf(renderToString(React.createElement(plugin.ProfilesSection, {
  status: sampleStatus, busy: false,
  editing: { name: 'custom', profile: sampleStatus.profiles.custom },
  onEdit: noop, onCopy: noop, onCancel: noop, onSave: noop, onDelete: noop
})))
assert.ok(profilesHtml.includes('custom'), 'profiles must list names')
assert.ok(profilesHtml.includes('allow'), 'profiles must show mode')
assert.ok(profilesHtml.includes('Save'), 'open editor must render')
assert.ok(profilesHtml.includes('Create profile'), 'profiles must offer profile creation (Р3)')
assert.ok(profilesHtml.includes('Copy'), 'profiles must offer copy')
assert.ok(profilesHtml.includes('Delete'), 'profile rows must offer delete')

const editorHtml = flatOf(renderToString(React.createElement(plugin.ProfileEditor, {
  name: 'custom', profile: { mode: 'allow', tools: ['read', 'ghost'] }, controllableTools: ['read', 'write'],
  lockedTools: ['run_code'], busy: false,
  onSave: noop, onCancel: noop
})))
assert.ok(editorHtml.includes('allow — keep only selected'), 'editor must show the current mode in the pill')
assert.ok(editorHtml.includes('Enabled (available)'), 'allow mode must label the checked group')
assert.ok(editorHtml.includes('Disabled, can be enabled'), 'allow mode must label the unchecked group')
assert.ok(editorHtml.includes('Not controllable — always available'), 'editor must render the locked block')
assert.ok(editorHtml.includes('run_code'), 'locked block must list reserved names')
assert.ok(editorHtml.includes('limiter rejects the mask'), 'selected non-controllable names must carry a warning')

const newEditorHtml = flatOf(renderToString(React.createElement(plugin.ProfileEditor, {
  name: 'fresh', profile: { mode: 'deny', tools: [] }, controllableTools: ['read'], busy: false, isNew: true,
  onSave: noop, onCancel: noop
})))
assert.ok(newEditorHtml.includes('Name:'), 'new-profile editor must offer a name field')
assert.ok(newEditorHtml.includes('deny — hide selected'), 'new deny profile must show deny mode')
assert.ok(newEditorHtml.includes('Disabled (hidden)'), 'deny mode must label the checked group')

const scanHtml = flatOf(renderToString(React.createElement(plugin.ScanSection, {
  report: { available: true, groups: { controllable: ['read', 'write'], locked: ['run_code', 'team_x'] } }
})))
assert.ok(scanHtml.includes('Tool scan'), 'scan section must render')
assert.ok(!scanHtml.includes('Refresh tools'), 'scan section must have no own refresh button (Р2)')
assert.ok(scanHtml.includes('✅ 2 tools can be disabled'), 'scan must summarize the controllable group')
assert.ok(scanHtml.includes('⚠ 2 tools cannot be disabled'), 'scan must summarize the uncontrollable group')
assert.ok(!scanHtml.includes('team_x'), 'scan must not list tool names (lists live in Предупреждения)')

const scanUnavailableHtml = flatOf(renderToString(React.createElement(plugin.ScanSection, {
  report: { available: false, report: {} }
})))
assert.ok(scanUnavailableHtml.includes('registry unavailable'), 'unavailable registry must show one honest line instead of a flood')

const packsHtml = flatOf(renderToString(React.createElement(plugin.PacksSection, {
  packs: sampleStatus.packs, busy: false, onImport: noop
})))
assert.ok(packsHtml.includes('Градиент'), 'packs must list templates')
assert.ok(packsHtml.includes('Import'), 'packs must offer import')
assert.ok(packsHtml.includes('strict, balanced, soft'), 'packs must show their profiles')

console.log('client-render: PASS')
