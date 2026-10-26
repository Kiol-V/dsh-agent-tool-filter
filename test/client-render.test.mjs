// client-render.test.mjs — локальный смоук рендера клиентской карточки.
// Захватывает компонент из lib/client.js через фейковый ctx (apply → slots.register)
// и рендерит его через react-dom/server — ловит падения рендера до живого профиля.
// Язык UI по умолчанию — en (resolveLang без локали платформы); RU проверяется явно.
// P3c: обёртка dock-слота conversation.input.dock — очередь по store (пустая →
// пусто, непустая → панель видна) и onAnswer → remote-канал.
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

// 2. Фейковый ctx: apply должен зарегистрировать слоты plugins.row.config
// и conversation.input.dock (entry «моста апрува» — полоса над баром ввода).
const calls = { mount: 0, registrations: [], injects: [], slotInjects: [], cleanups: [] }
// Пакет для снимка очереди: сессия root-агента root-00000001.
const approvalPacket = {
  requestId: 'approval-abcd1234-call-1',
  rootSessionId: 'root-00000001',
  agent: {
    preset: 'wolf-websearcher',
    shortSessionId: 'abcd1234',
    assignment: 'Найти свежие релизы DeepSeek Harness',
    assignmentFound: true
  },
  action: { toolName: 'pwsh', arguments: { command: 'node scripts/build.mjs' } },
  justification: 'Нужен актуальный источник по релизам',
  createdAt: '2026-10-24T10:00:00.000Z'
}
const answerCalls = []
const streamState = { aborted: false }
const fakeNs = {
  status: async () => ({
    ok: true,
    value: { enabled: true, language: 'auto', agents: [], presets: {}, profiles: {}, presetIds: [], tools: [], warnings: [] }
  }),
  answerApprovalRequest: async (requestId, decision) => {
    answerCalls.push(['ns', requestId, decision])
    return { ok: true, value: 'allowed-once' }
  },
  // Stream «моста апрува»: первый кадр — snapshot с пакетом, дальше генератор
  // ЖДЁТ abort без таймеров (иначе pump уйдёт в reconnect-паузу 3 с и процесс
  // не завершится); abort фиксируем — им проверяется store.stop() на unmount.
  watchApprovalRequests: signal => (async function * () {
    yield { type: 'snapshot', requests: [approvalPacket] }
    await new Promise(resolve => {
      if (signal?.aborted === true) { streamState.aborted = true; return resolve() }
      signal?.addEventListener('abort', () => { streamState.aborted = true; resolve() }, { once: true })
    })
  })()
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
  effect: (setup) => {
    // Как cordis: setup выполняется сразу, cleanup сохраняем на unmount-проверку.
    calls.cleanups.push(setup())
    return () => {}
  },
  slots: {
    inject: (name, factory) => {
      calls.slotInjects.push(name)
      return factory()
    },
    register: (descriptor, component) => {
      const record = { descriptor, component, disposed: false }
      calls.registrations.push(record)
      return () => { record.disposed = true }
    }
  }
}
plugin.apply(fakeCtx)

const rowConfigReg = calls.registrations.find(record => record.descriptor.name === 'plugins.row.config')
assert.ok(rowConfigReg, 'apply registers the row-config seat')
assert.equal(rowConfigReg.descriptor.key, 'dsh-agent-tool-filter#agent-tool-filter')
assert.ok(calls.slotInjects.includes('plugins.row.config'), 'row-config seat is wired via slots.inject')

// P3c: entry списка conversation.input.dock — полоса НАД composer-баром (бар
// ввода не вытесняется, кейс 05); цепочка conversation.composer ему больше
// не принадлежит. Контракт списочных слотов: id/order, без chain-select.
assert.ok(calls.slotInjects.includes('conversation.input.dock'), 'input dock seat is wired via slots.inject')
assert.ok(!calls.slotInjects.includes('conversation.composer'), 'the composer chain must stay free for the stock bar')
const dockRegs = () => calls.registrations.filter(record => record.descriptor.name === 'conversation.input.dock')
const approvalEntryReg = dockRegs().find(record => record.descriptor.id === 'approval-bridge')
assert.ok(approvalEntryReg, 'apply registers the approval-bridge dock entry')
assert.equal(approvalEntryReg.descriptor.order, 30, 'the dock entry renders after the stock dock entries')
assert.equal(approvalEntryReg.descriptor.select, undefined, 'a list-slot entry must not carry a chain select')

// Пустой store: обёртка ничего не показывает (dock-слот и так рендерит бар).
assert.equal(
  renderToString(React.createElement(approvalEntryReg.component, { session: { sessionId: 'root-00000001' } })),
  '',
  'the dock entry must render nothing on an empty store'
)

// 2b. После $mount (микро-такты) namespace должен захватиться через ctx.inject;
// захват namespace стартует store — snapshot-кадр заполняет очередь.
await new Promise(resolve => setTimeout(resolve, 0))
assert.ok(calls.injects.some(names => names.includes('remote.agentToolFilter')), 'namespace captured via ctx.inject')
assert.ok(calls.injects.some(names => names.includes('locale')), 'locale face captured via ctx.inject')
await new Promise(resolve => setTimeout(resolve, 0))

// P3c: store получил snapshot — обёртка рендерит панель для СВОЕЙ сессии
// (owner-пропс dock-слота InputZone.session), чужую сессию и отсутствие
// сессии не берёт.
const approvalHtml = renderToString(React.createElement(approvalEntryReg.component, { session: { sessionId: 'root-00000001' } }))
const approvalFlat = approvalHtml.replaceAll('<!-- -->', '')
assert.ok(approvalFlat.includes('Разрешить (один раз)'), `wrapper must render the panel with a queued packet, got: ${approvalHtml.slice(0, 300)}`)
assert.ok(approvalFlat.includes('wolf-websearcher'), 'panel must show the requesting preset')
const ghostHtml = renderToString(React.createElement(approvalEntryReg.component, { session: { sessionId: 'root-00000002' } }))
assert.equal(ghostHtml, '', 'wrapper must render nothing for a session without packets')
const noSessionHtml = renderToString(React.createElement(approvalEntryReg.component, { session: undefined }))
assert.equal(noSessionHtml, '', 'wrapper must render nothing without a session')

// onAnswer → answerApprovalRequest с верными аргументами (мок-сервис в параметре).
await plugin.answerApprovalRequest('approval-req-1', 'allow', { answerApprovalRequest: async (...args) => { answerCalls.push(['mock', ...args]); return { ok: true, value: 'allowed-once' } } })
assert.deepEqual(answerCalls.filter(call => call[0] === 'mock'), [['mock', 'approval-req-1', 'allow']], 'answerApprovalRequest must forward requestId and decision')
// Точный вызов панели: onAnswer(requestId, decision) без сервиса — service
// резолвится из захваченного namespace (serviceRef), как в бою.
await plugin.answerApprovalRequest('approval-req-3', 'allow')
assert.deepEqual(answerCalls.filter(call => call[0] === 'ns'), [['ns', 'approval-req-3', 'allow']], 'the two-arg panel call must reach the captured namespace')
// Ошибки вызова — отказ промиса: панель (failBack) логирует и сбрасывает
// кнопки, поэтому промис здесь НЕ глотается.
await assert.rejects(
  () => plugin.answerApprovalRequest('approval-req-2', 'reject', { answerApprovalRequest: async () => { throw new Error('service down') } }),
  /service down/,
  'a failed answer must reject so the panel can reset its buttons'
)

// 3. Рендер страницы строки (view: 'page') — как это делает SlotOutlet.
const page = renderToString(React.createElement(rowConfigReg.component, { view: 'page', form: undefined }))
const flat = page.replaceAll('<!-- -->', '')
assert.ok(flat.includes('Tool filtering'), `card must render (en default), got: ${page.slice(0, 400)}`)
assert.ok(flat.includes('Filtering enabled'), 'card must contain the enable toggle')
assert.ok(flat.includes('Refresh'), 'card must contain the refresh button')
assert.ok(flat.includes('Plugin UI language'), 'card must contain the language row')

// 4. Рендер summary-вида.
const summary = renderToString(React.createElement(rowConfigReg.component, { view: 'summary' }))
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
assert.ok(editorHtml.includes('the platform does not allow disabling it'), 'locked block must explain why the name is fixed')
assert.ok(editorHtml.includes('ghost'), 'unknown selected names must render with a checkbox in the main lists')
assert.ok(editorHtml.includes('not found in the tool registry'), 'unknown selected names must carry a typo note')
assert.ok(!editorHtml.includes('limiter rejects the mask'), 'no selected locked names in this fixture — no limiter warning')

// Выбранное locked-имя («ограничитель отклонит маску») — с чекбоксом в общем списке.
const lockedPickedHtml = flatOf(renderToString(React.createElement(plugin.ProfileEditor, {
  name: 'custom', profile: { mode: 'deny', tools: ['team_x'] }, controllableTools: ['read'],
  lockedTools: ['run_code', 'team_x'], busy: false,
  onSave: noop, onCancel: noop
})))
assert.ok(lockedPickedHtml.includes('limiter rejects the mask'), 'selected locked names must warn about the limiter')
assert.ok(lockedPickedHtml.includes('<input type="checkbox" checked=""'), 'selected locked names must render as checked checkboxes')

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

// 5c. Предупреждения: ❌-варн несёт кнопку «Убрать имя из профиля», ⚠ — без кнопки.
const warningsHtml = flatOf(renderToString(React.createElement(plugin.WarningsSection, {
  items: [
    { type: 'locked', text: '⚠ нельзя отключить (1): run_code — всегда доступны агенту' },
    { type: 'unknown', text: '❌ ghost_tool — не найдено · профили: custom', tool: 'ghost_tool', profiles: ['custom'] }
  ],
  busy: false,
  onRemoveName: () => {}
})))
assert.ok(warningsHtml.includes('ghost_tool'), 'warnings must list the unknown name')
assert.ok(warningsHtml.includes('Remove name from profile'), 'unknown warnings must offer the remove button')
assert.ok(warningsHtml.indexOf('Remove name from profile') > warningsHtml.indexOf('ghost_tool'), 'the button must sit on the unknown warning')
assert.ok(!warningsHtml.slice(0, warningsHtml.indexOf('ghost_tool')).includes('Remove name from profile'), 'locked warnings must carry no remove button')

const packsHtml = flatOf(renderToString(React.createElement(plugin.PacksSection, {
  packs: sampleStatus.packs, busy: false, onImport: noop
})))
assert.ok(packsHtml.includes('Градиент'), 'packs must list templates')
assert.ok(packsHtml.includes('Import'), 'packs must offer import')
assert.ok(packsHtml.includes('strict, balanced, soft'), 'packs must show their profiles')

// P3c unmount: cleanup эффекта останавливает store — активный stream получил
// abort (иначе переподписки живут после выгрузки плагина).
assert.equal(streamState.aborted, false, 'the approval stream must be live while the plugin is mounted')
for (const cleanup of calls.cleanups) {
  if (typeof cleanup === 'function') cleanup()
}
assert.equal(streamState.aborted, true, 'plugin unmount must stop the store (stream aborted)')

console.log('client-render: PASS')
