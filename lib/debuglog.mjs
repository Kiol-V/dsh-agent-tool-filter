import { appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Файловая диагностика управляется опцией debugLog конфига (по умолчанию ВЫКЛ);
// переменная окружения ATF_DEBUG_LOG — принудительный override: включает лог и задаёт путь.
// options.enabled — boolean или функция-геттер (hot-переключение через настройки);
// options.file — свой путь файла (по умолчанию — tmpdir/agent-tool-filter-debug.log).
export function makeDebugLog (options = {}) {
  return (kind, message) => {
    const envPath = process.env.ATF_DEBUG_LOG
    const envEnabled = envPath !== undefined && envPath !== ''
    const flag = typeof options.enabled === 'function' ? options.enabled() : options.enabled
    if (!envEnabled && flag !== true) return
    const filePath = envEnabled ? envPath : (options.file || path.join(tmpdir(), 'agent-tool-filter-debug.log'))
    try {
      const timestamp = new Date().toISOString()
      const line = `${timestamp} | ${String(kind).replace(/[\r\n]+/g, ' ')} | ${String(message).replace(/[\r\n]+/g, ' ')}`
      appendFileSync(filePath, `${line}\n`, 'utf8')
    } catch { /* diagnostic logging must never affect plugin behavior */ }
  }
}
