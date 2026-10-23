// lib/detect.mjs — детекция «грязной» истории и выбор режима применения фильтра.
//
// Контекст: на строгих провайдерах (Polza.ai) сессии, чья ИСТОРИЯ содержит вызовы
// скрываемых инструментов, падают («провайдер вернул некорректный вызов инструмента»):
// модель продолжает вызывать инструмент по истории, а в текущем списке tools его уже нет.
// Поэтому auto-режим выбирает:
//   - hide (скрыть схемы — экономия токенов), когда история вызовов чиста;
//   - block (схемы оставить, вызовы запрещать guard'ом — список для провайдера не меняется),
//     когда история содержит вызовы скрываемых инструментов.
//
// Источник истории: session.deriveMessages() — синхронный кэш тех же сообщений,
// которые уходят модели (включая tool-call блоки).

// Семантическая грязь: имя скрываемого инструмента упомянуто в ТЕКСТЕ истории
// (в т.ч. в summary компакции) — консервативно считаем историю грязной (режим block).
// Только для deny-профилей: в allow-режиме текстовые упоминания нерелевантны.
function mentionsBlocked (text, names) {
  for (const name of names) {
    if (typeof name !== 'string' || name === '') continue
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp('(^|[^A-Za-z0-9_])' + escaped + '([^A-Za-z0-9_]|$)').test(text)) return true
  }
  return false
}

// true — история содержит вызовы скрываемых инструментов; false — нет;
// undefined — проверить не удалось (нет API/ошибка).
export function detectHiddenCalls (agent, profile) {
  const derive = agent?.session?.deriveMessages
  if (typeof derive !== 'function') return undefined
  let messages
  try {
    messages = derive.call(agent.session)
  } catch {
    return undefined
  }
  if (!Array.isArray(messages)) return undefined

  const blocked = (name) => typeof name === 'string' &&
    (profile.mode === 'allow' ? !profile.tools.includes(name) : profile.tools.includes(name))

  try {
    for (const message of messages) {
      const content = Array.isArray(message?.content) ? message.content : null
      if (content !== null) {
        for (const block of content) {
          if (block === null || typeof block !== 'object') continue
          if ((block.type === 'tool-call' || block.type === 'tool_use') && blocked(block.name)) {
            return true
          }
          if (profile.mode !== 'allow' && (block.type === 'text' || block.type === 'reasoning')) {
            const text = typeof block.text === 'string' ? block.text : ''
            if (text !== '' && mentionsBlocked(text, profile.tools)) return true
          }
        }
      }
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : null
      if (toolCalls !== null) {
        for (const call of toolCalls) {
          if (blocked(call?.function?.name ?? call?.name)) return true
        }
      }
    }
    return false
  } catch {
    return undefined
  }
}

// behavior: 'auto' — детекция; 'hide' — всегда скрывать схемы; 'block' — всегда guard.
// Фолбэк auto при недоступной детекции: source 'startup' (сессия родилась под фильтром) → hide,
// иначе (resume/горячее применение) → block (консервативно: список для провайдера не меняется).
export function resolveMode (cfg, agent, profile, source) {
  if (cfg.behavior === 'hide') return 'hide'
  if (cfg.behavior === 'block') return 'block'
  const contaminated = detectHiddenCalls(agent, profile)
  if (contaminated === true) return 'block'
  if (contaminated === false) return 'hide'
  return source === 'startup' ? 'hide' : 'block'
}
