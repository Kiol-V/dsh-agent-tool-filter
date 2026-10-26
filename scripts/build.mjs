import { spawn } from 'node:child_process'
import { closeSync, openSync, readSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageName = 'dsh-agent-tool-filter'
// Кроссплатформенный вызов: на Linux установщик esbuild кладёт в bin/esbuild
// нативный бинарник (запускается напрямую), на Windows — JS-обёртку (через
// node); тип определяется по магическим байтам (ELF 0x7F / MZ 0x4D), как в
// test/approval-panel-render.test.mjs.
const binary = path.join(repoRoot, 'node_modules', 'esbuild', 'bin', 'esbuild')
const binFd = openSync(binary, 'r')
const binHead = Buffer.alloc(4)
readSync(binFd, binHead, 0, 4, 0)
closeSync(binFd)
const nativeBin = binHead[0] === 0x7f || binHead[0] === 0x4d
const banner = `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`
const args = [
  path.join(repoRoot, 'client', 'index.jsx'),
  '--bundle',
  '--platform=browser',
  '--format=cjs',
  '--target=es2022',
  '--jsx=automatic',
  '--define:process.env.NODE_ENV="production"',
  // Платформенные модули обязаны приходить через require-карту загрузчика
  // (window.__ModuleLoader__ seed map), а не из бандла — иначе «build-time
  // externals drift»: дубликат React и отказ активации entry при web boot.
  '--external:react',
  '--external:react/jsx-runtime',
  '--external:react-dom',
  '--external:react-dom/client',
  '--external:@deepseek-ai/cordis',
  '--external:@deepseek-ai/dsh-client-store',
  '--external:@deepseek-ai/dsh-client-ui-slots',
  '--external:@deepseek-ai/dsh-client-ui-primitives',
  '--external:@deepseek-ai/dsh-client-ui-dockkit',
  `--banner:js=${banner}`,
  '--footer:js=return module.exports; } });',
  '--legal-comments=none',
  `--outfile=${path.join(repoRoot, 'lib', 'client.js')}`
]

// Inherit stdio and call the esbuild CLI directly instead of its Node API,
// whose service IPC uses child-process pipes unavailable in restricted shells.
const child = nativeBin
  ? spawn(binary, args, { cwd: repoRoot, stdio: 'inherit', windowsHide: true })
  : spawn(process.execPath, [binary, ...args], { cwd: repoRoot, stdio: 'inherit', windowsHide: true })
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', (code, signal) => resolve(code ?? (signal === null ? 1 : 1)))
})
if (exitCode !== 0) process.exitCode = exitCode
