// test/approval-panel-render.test.mjs — SSR-смоук панели «моста апрува»
// (client/approval-panel.jsx): один запрос (все поля и обе кнопки), очередь из
// трёх (счётчик «1 из 3», переключение, порядок по createdAt), задание не
// найдено и пустое обоснование, пустая очередь. JSX собирается esbuild-CLI
// через JS-обёртку `node_modules/esbuild/bin/esbuild` (Node API esbuild
// требует pipes, недоступных в песочнице), затем компонент рендерится через
// react-dom/server.
// Запуск: node test/approval-panel-render.test.mjs (из repo/).

import { spawnSync } from 'node:child_process'
import { readFileSync, unlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..')
const requireFromRepo = createRequire(path.join(REPO, 'package.json'))

const React = requireFromRepo('react')
const { renderToString } = requireFromRepo('react-dom/server')
const jsxRuntime = requireFromRepo('react/jsx-runtime')

// 1. Сборка компонента во временный CJS-бандл (react и jsx-runtime — externals,
// карта require подменяется при загрузке, как в client-render.test.mjs).
// Вызов — через официальную JS-CLI-обёртку пакета esbuild: она сама находит
// платформенный бинарник (в т.ч. bin/esbuild у @esbuild/* на Linux), поэтому
// путь вызова не зависит от ОС и раскладки нативных пакетов.
const esbuildCli = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild')
const outfile = path.join(REPO, 'test', `.tmp-approval-panel-${process.pid}.cjs`)
const build = spawnSync(process.execPath, [
  esbuildCli,
  path.join(REPO, 'client', 'approval-panel.jsx'),
  '--bundle',
  '--platform=browser',
  '--format=cjs',
  '--target=es2022',
  '--jsx=automatic',
  '--external:react',
  '--external:react/jsx-runtime',
  '--legal-comments=none',
  `--outfile=${outfile}`
], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] })
const buildLog = `${build.stdout ?? ''}${build.stderr ?? ''}`.toString().trim()
assert.equal(
  build.status,
  0,
  `esbuild must compile client/approval-panel.jsx: ${build.error?.message ?? `status ${build.status}`}${buildLog === '' ? '' : `\n${buildLog}`}`
)

const bundleSource = readFileSync(outfile, 'utf8')
const moduleShim = { exports: {} }
const localRequire = spec => {
  if (spec === 'react') return React
  if (spec === 'react/jsx-runtime') return jsxRuntime
  throw new Error(`unexpected require: ${spec}`)
}
new Function('module', 'exports', 'require', bundleSource)(moduleShim, moduleShim.exports, localRequire)
const { ApprovalBridgePanel } = moduleShim.exports
assert.equal(typeof ApprovalBridgePanel, 'function', 'panel module must export ApprovalBridgePanel')

// 2. Рендер-хелпер: SSR + снятие comment-маркеров между текстовыми узлами.
const flatOf = html => html.replaceAll('<!-- -->', '')
const render = requests => flatOf(renderToString(React.createElement(ApprovalBridgePanel, {
  requests,
  onAnswer: () => {}
})))

const basePacket = (requestId, overrides = {}) => ({
  requestId,
  rootSessionId: 'root-00000001',
  agent: {
    preset: 'wolf-websearcher',
    shortSessionId: 'abcd1234',
    assignment: 'Найти свежие релизы DeepSeek Harness',
    assignmentFound: true
  },
  action: {
    toolName: 'pwsh',
    arguments: { path: 'repo/scripts/build.mjs', command: 'node scripts/build.mjs' }
  },
  justification: 'Нужен актуальный источник по релизам',
  createdAt: '2026-10-24T10:00:00.000Z',
  ...overrides
})

// 3. Один запрос: идентификация, раскрытие (кто/что/обоснование), кнопки.
const single = render([basePacket('approval-abcd1234-call-1')])
assert.ok(single.includes('wolf-websearcher'), 'card header must show the preset')
assert.ok(single.includes('abcd1234'), 'card header must show the short session id')
assert.ok(single.includes('pwsh'), 'card header must show the tool name')
assert.ok(single.includes('approval-abcd1234-call-1'), 'requestId must render as a small line')
assert.ok(single.includes('Найти свежие релизы DeepSeek Harness'), 'the wolf assignment must render')
assert.ok(single.includes('node scripts/build.mjs'), 'arguments must render as readable JSON')
assert.ok(single.includes('atf-ap-arg-hl'), 'path/command argument lines must be highlighted')
assert.ok(single.includes('Нужен актуальный источник по релизам'), 'justification must render')
assert.ok(single.includes('Разрешить (один раз)'), 'the allow-once button must render')
assert.ok(single.includes('Отклонить'), 'the reject button must render')
assert.ok(!single.includes('atf-ap-counter'), 'a single request must show no queue counter')

// 4. Три запроса: порядок по createdAt, счётчик «1 из 3», переключение ‹ ›.
const three = render([
  basePacket('r-third', {
    createdAt: '2026-10-24T10:05:00.000Z',
    action: { toolName: 'tool-gamma', arguments: {} }
  }),
  basePacket('r-second', {
    createdAt: '2026-10-24T10:02:00.000Z',
    action: { toolName: 'tool-beta', arguments: {} }
  }),
  basePacket('r-first', {
    createdAt: '2026-10-24T10:01:00.000Z',
    action: { toolName: 'tool-alpha', arguments: {} }
  })
])
assert.ok(three.includes('1 из 3'), 'the queue must show the «k из N» counter')
assert.ok(three.includes('Предыдущий запрос'), 'the queue must offer the previous-request switch')
assert.ok(three.includes('Следующий запрос'), 'the queue must offer the next-request switch')
assert.ok(three.includes('tool-alpha'), 'the earliest createdAt request must be shown first')
assert.ok(!three.includes('tool-beta') && !three.includes('tool-gamma'), 'later requests must wait in the queue')

// 5. assignmentFound=false и пустое обоснование — честные заглушки, без выдумок.
const missing = render([basePacket('r-missing', {
  agent: { preset: 'tester', shortSessionId: 'deadbeef', assignment: null, assignmentFound: false },
  justification: ''
})])
assert.ok(missing.includes('Задание не установлено'), 'assignmentFound=false must show the honest stub')
assert.ok(!missing.includes('Найти свежие релизы'), 'the missing assignment must not be invented')
assert.ok(missing.includes('без обоснования'), 'an empty justification must show the honest stub')

// 6. Пустая очередь — панель не рендерится.
assert.equal(render([]), '', 'an empty request queue must render nothing')

// 7. Визуальная изоляция agent-строк (hardening): управляющие символы
// (bidi/zero-width) вычищаются до рендер, длинные поля капятся с многоточием.
// Символы собираются через fromCharCode — в исходнике теста нет литеральных
// невидимых символов.
const RLO = String.fromCharCode(0x202E) // bidi override
const ZWSP = String.fromCharCode(0x200B) // zero-width space
const tricky = render([basePacket('r-bidi', {
  agent: {
    preset: 'wolf',
    shortSessionId: 'deadbeef',
    assignment: `Зад${RLO}ание${ZWSP}${'а'.repeat(4100)}`,
    assignmentFound: true
  },
  justification: `Обоснов${RLO}ание`,
  action: { toolName: 'pwsh', arguments: { command: `echo ${RLO}${'б'.repeat(2100)}` } }
})])
assert.ok(!tricky.includes(RLO) && !tricky.includes(ZWSP), 'bidi/zero-width controls must be stripped before render')
assert.ok(tricky.includes('Задание'), 'visible text around the stripped controls must survive')
assert.ok(tricky.includes('…'), 'capped fields must render the ellipsis')
assert.ok(!tricky.includes('а'.repeat(4000)), 'the assignment must be capped at 4000 chars')
assert.ok(!tricky.includes('б'.repeat(2001)), 'argument lines must be capped at 2000 chars')
assert.ok(tricky.includes('atf-ap-arg-hl'), 'highlighting must run on the cleaned argument line')

try { unlinkSync(outfile) } catch { /* временный бандл уйдёт в очистку ОС */ }
console.log('approval-panel-render: PASS')
