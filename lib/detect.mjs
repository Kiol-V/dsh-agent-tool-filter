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
          if (block !== null && typeof block === 'object' &&
              (block.type === 'tool-call' || block.type === 'tool_use') && blocked(block.name)) {
            return true
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
