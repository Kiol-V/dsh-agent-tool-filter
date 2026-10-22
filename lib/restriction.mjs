// lib/restriction.mjs — применение и снятие ограничений restrict() на scope агента.
// Маски restrict() пересекаются: перед каждым новым применением старые disposers
// снимаются. Состояние (включая disposers) живёт на самом агенте (Symbol.for стабилен
// между пересозданиями модуля — hot-reload плагина его не теряет).

import { errorMessage } from './logger.mjs'

export const APPLIED = Symbol.for('dsh-agent-tool-filter/applied')

export function applyRestriction (agent, presetId, profileName, profile, log, filterMode = 'hide') {
  // Доступ к сервису tools — двойной: ctx.get() (канон K1) + fallback на свойство контекста
  // (агентский scope может отдавать сервис только свойством; см. CASE-2026-10-15-001).
  const tools = (typeof agent?.ctx?.get === 'function' ? agent.ctx.get('tools') : undefined) ?? agent?.ctx?.tools
  const restrict = tools?.restrict
  if (typeof restrict !== 'function') {
    log('warn', 'agent-tool-filter: tools-сервис агента недоступен (нет restrict), фильтр не применён')
    return
  }

  const target = agent.id ?? 'agent'
  const visibleBefore = safeVisibleCount(tools)
  const disposers = []
  const skipped = []
  let applied = 0

  if (profile.mode === 'allow') {
    try {
      // allow — всегда ОДНИМ вызовом: маски пересекаются.
      disposers.push(restrict.call(tools, { allow: profile.tools }))
      applied = profile.tools.length
    } catch (error) {
      skipped.push(errorMessage(error))
    }
  } else {
    // deny — поимённо: неизвестное имя не блокирует остальные.
    for (const name of profile.tools) {
      try {
        disposers.push(restrict.call(tools, { deny: [name] }))
        applied += 1
      } catch (error) {
        skipped.push(`${name} (${errorMessage(error)})`)
      }
    }
  }

  const visibleAfter = safeVisibleCount(tools)
  const hidden = (visibleBefore !== null && visibleAfter !== null && visibleBefore > visibleAfter)
    ? visibleBefore - visibleAfter
    : applied

  const state = {
    presetId,
    profileName,
    mode: profile.mode,
    applied,
    hidden,
    skipped,
    disposers,
    at: new Date().toISOString()
  }
  storeState(agent, state)

  const skippedText = skipped.length > 0 ? `; пропущено: ${skipped.join(' | ')}` : ''
  log('info', `agent-tool-filter: ${filterMode} «${profileName}» применён к агенту ${target} (пресет ${presetId}; скрыто схем: ${hidden})${skippedText}`)
}

export function clearRestriction (agent) {
  const state = readState(agent)
  if (state === undefined) return false
  for (const dispose of state.disposers ?? []) {
    try { dispose() } catch { /* disposer мог протухнуть вместе со scope */ }
  }
  try { delete agent[APPLIED] } catch { /* noop */ }
  return true
}

export function storeState (agent, state) {
  // Состояние (включая disposers) живёт на самом агенте, чтобы пережить re-apply плагина.
  try {
    agent[APPLIED] = state
  } catch { /* агент не принимает свойства — состояние одноразовое */ }
}

export function readState (agent) {
  try {
    const state = agent[APPLIED]
    return (state !== null && typeof state === 'object') ? state : undefined
  } catch {
    return undefined
  }
}

export function safeVisibleCount (tools) {
  try {
    const schemas = tools.schemas?.()
    return Array.isArray(schemas) ? schemas.length : null
  } catch {
    return null
  }
}

// Режим block: схемы НЕ скрываются (список для запроса к провайдеру остаётся полным —
// история и список согласованы, строгие провайдеры вроде Polza не падают), а вызов
// скрываемых инструментов запрещается guard'ом на скоупе агента. Субагенты guard не
// наследуют (дети получают отдельный scope) — волки работают с полным набором.
export function applyBlock (agent, presetId, profileName, profile, log) {
  const tools = (typeof agent?.ctx?.get === 'function' ? agent.ctx.get('tools') : undefined) ?? agent?.ctx?.tools
  const guard = tools?.guard
  if (typeof guard !== 'function') {
    log('warn', 'agent-tool-filter: tools.guard() недоступен — откат на скрытие схем')
    return applyRestriction(agent, presetId, profileName, profile, log, 'block')
  }

  const target = agent.id ?? 'agent'
  const hidden = new Set(profile.mode === 'allow' ? [] : profile.tools)
  const disposer = guard.call(tools, (exec) => {
    const name = exec?.name
    if (typeof name !== 'string') return undefined
    const blocked = profile.mode === 'allow' ? !profile.tools.includes(name) : hidden.has(name)
    return blocked
      ? `инструмент "${name}" отключён фильтром основного агента — делегируйте задачу субагенту (они работают с полным набором)`
      : undefined
  })

  storeState(agent, {
    presetId,
    profileName,
    mode: 'block',
    applied: profile.mode === 'allow' ? 1 : profile.tools.length,
    hidden: 0,
    skipped: [],
    disposers: [disposer],
    at: new Date().toISOString()
  })
  log('info', `agent-tool-filter: block «${profileName}» применён к агенту ${target} (пресет ${presetId}; скрыто схем: 0; схемы оставлены, вызовы скрываемых инструментов запрещаются)`)
}
