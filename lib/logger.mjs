// lib/logger.mjs — логгер плагина и нормализация сообщений об ошибках.
// Падение логгера не должно ронять плагин; фолбэк — console.warn.

export function makeLogger (ctx) {
  return (level, text) => {
    try {
      const logger = ctx?.logger
      const fn = (logger && typeof logger[level] === 'function') ? logger[level] : undefined
      if (fn) {
        fn.call(logger, text)
        return
      }
    } catch { /* падение логгера не должно ронять плагин */ }
    try {
      console.warn(text)
    } catch { /* noop */ }
  }
}

export function errorMessage (error) {
  return error instanceof Error ? error.message : String(error)
}
