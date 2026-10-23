import { appendFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Файловая диагностика управляется опцией debugLog конфига (по умолчанию ВЫКЛ);
// переменная окружения ATF_DEBUG_LOG — принудительный override: включает лог и задаёт путь.
// options.enabled — boolean или функция-геттер (hot-переключение через настройки);
// options.file — свой путь файла (по умолчанию — tmpdir/agent-tool-filter-debug.log).
export function defaultLogFile () {
  const home = process.env.DSH_HOME
  if (typeof home === 'string' && home.trim() !== '') {
    return path.join(home, 'logs', 'agent-tool-filter-debug.log')
  }
  return path.join(tmpdir(), 'agent-tool-filter-debug.log')
}

// Итоговый путь файла лога для показа в UI: env ATF_DEBUG_LOG → дефолт
// (<DSH_HOME>/logs/… или tmpdir). options.file живёт только в makeDebugLog
// (внутренние вызовы) — UI показывает именно этот путь.
export function resolveLogPath () {
  const envPath = process.env.ATF_DEBUG_LOG
  if (typeof envPath === 'string' && envPath !== '') return envPath
  return defaultLogFile()
}
export function makeDebugLog (options = {}) {
  return (kind, message) => {
    const envPath = process.env.ATF_DEBUG_LOG
    const envEnabled = envPath !== undefined && envPath !== ''
    const flag = typeof options.enabled === 'function' ? options.enabled() : options.enabled
    if (!envEnabled && flag !== true) return
    const filePath = envEnabled ? envPath : (options.file || defaultLogFile())
    try {
      const timestamp = new Date().toISOString()
      const line = `${timestamp} | ${String(kind).replace(/[\r\n]+/g, ' ')} | ${String(message).replace(/[\r\n]+/g, ' ')}`
      mkdirSync(path.dirname(filePath), { recursive: true })
      appendFileSync(filePath, `${line}\n`, 'utf8')
    } catch { /* diagnostic logging must never affect plugin behavior */ }
  }
}
