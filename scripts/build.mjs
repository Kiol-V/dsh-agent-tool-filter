import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageName = 'dsh-agent-tool-filter'
const executable = process.platform === 'win32' ? 'esbuild.exe' : 'esbuild'
const binary = path.join(repoRoot, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, executable)
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

// Inherit stdio and call the native esbuild CLI directly instead of its Node API,
// whose service IPC uses child-process pipes unavailable in restricted shells.
const child = spawn(binary, args, { cwd: repoRoot, stdio: 'inherit', windowsHide: true })
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', (code, signal) => resolve(code ?? (signal === null ? 1 : 1)))
})
if (exitCode !== 0) process.exitCode = exitCode
