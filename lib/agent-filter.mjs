// lib/agent-filter.mjs — обработка агентов: корневой или нет, какой пресет, какой профиль.
// Фильтруются ТОЛЬКО корневые агенты: in-process дети присоединяются к ПРЕСТу родителя
// (composeFrom) и показывают тот же composedPreset — без проверки roots() фильтр задел бы
// субагентов. SDK-субагенты живут в отдельном процессе и событие не эмитят.

import { applyRestriction, applyBlock, clearRestriction, readState } from './restriction.mjs'
import { resolveMode } from './detect.mjs'

const noop = () => {}

function toolNames (tools) {
  try {
    const view = tools?.view?.()
    if (Array.isArray(view?.knownNames)) return view.knownNames
    const schemas = tools?.schemas?.()
    if (Array.isArray(schemas)) return schemas.map(schema => schema?.name).filter(Boolean)
    return []
  } catch {
    return []
  }
}

export function makeAgentFilter (ctx, cfg, log, dlog = noop, presetByAgent = new WeakMap()) {
  const rootsOf = () => {
    try {
      const list = ctx.get('agents')?.roots?.()
      return Array.isArray(list) ? list : null
    } catch {
      return null
    }
  }

  const presetOf = (agent) => {
    try {
      return { presetId: ctx.get('agentPresets')?.composedPreset?.(agent.ctx), error: undefined }
    } catch (error) {
      return { presetId: undefined, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // Отложенные повторы (1.0.1): пресет агента при создании бывает промежуточным
  // (composedPreset отдаёт дефолт, настоящий приходит событием agent-preset/selected
  // десятки секунд спустя) — повторы сжимают окно, пока агент без фильтра.
  const RETRY_DELAYS = [2000, 6000, 15000, 30000]
  const retryTimers = new Set()
  const scheduleRetry = (agent, attempt) => {
    if (attempt >= RETRY_DELAYS.length) return
    const timer = setTimeout(() => {
      retryTimers.delete(timer)
      handle(agent, 'retry', attempt + 1)
    }, RETRY_DELAYS[attempt])
    // Повторы — фоновые: не держим event loop (и процесс тестов) живым ради них.
    timer.unref?.()
    retryTimers.add(timer)
  }
  const disposeTimers = () => {
    for (const timer of retryTimers) clearTimeout(timer)
    retryTimers.clear()
  }

  // Обработка идемпотентна. Маска меняется только когда решение принято: пресет вне
  // матрицы — снять (unbind-семантика: убрал связку, ограничения сняты), профиль
  // найден — переложить (старые disposers снимаются перед новыми). Промежуточные
  // состояния (пресет ещё не назначен, профиль пропал) маску НЕ трогают — иначе
  // config-reload с пустой матрицей терял маску навсегда; возврат обеспечивают повторы.
  const handle = (agent, source, attempt = 0) => {
    const agentId = agent?.id ?? 'agent'
    dlog('handle', `вход: agent.id=${agentId}, source=${source ?? 'undefined'}`)
    try {
      const roots = rootsOf()
      dlog('handle', `rootsOf: ${roots === null ? 'null' : `корней=${roots.length}; includes(agent)=${roots.includes(agent)}`}`)
      if (roots === null) return // дети/субагенты не трогаются, реестр недоступен
      if (!roots.includes(agent)) {
        dlog('handle', `агент не в roots: ${agentId}`)
        return
      }

      const composed = presetOf(agent)
      dlog('handle', `presetOf: composedPreset=${composed.presetId ?? 'undefined'}${composed.error === undefined ? '' : `; ошибка=${composed.error}`}`)
      const eventPreset = presetByAgent?.get?.(agent)
      const presetId = composed.presetId ?? eventPreset
      const presetSource = composed.presetId !== undefined ? 'composedPreset' : (eventPreset !== undefined ? 'событие' : 'нет')
      dlog('handle', `выбор: presetId=${presetId ?? 'undefined'}; источник=${presetSource}`)
      if (presetId === undefined) {
        log('info', `agent-tool-filter: агент ${agentId} — пресет не привязан, ждём agent-preset/selected`)
        scheduleRetry(agent, attempt)
        return
      }
      const profileName = cfg.presets[presetId]
      const profile = profileName === undefined ? undefined : cfg.profiles[profileName]
      dlog('handle', `профиль: presetId=${presetId}; profileName=${profileName ?? 'undefined'}; найден=${profile !== undefined}`)
      if (profileName === undefined) {
        clearRestriction(agent) // unbind-семантика: связки нет — ограничения сняты
        const matrix = Object.entries(cfg.presets).map(([preset, name]) => `${preset} → ${name}`).join(', ') || 'пусто'
        log('warn', `agent-tool-filter: пресет «${presetId}» вне матрицы (матрица: ${matrix})`)
        scheduleRetry(agent, attempt) // пресет мог быть промежуточным — повтор проверит
        return
      }
      if (profile === undefined) {
        // Битый конфиг: прежнюю маску не трогаем (консервативно — ограничения остаются).
        log('warn', `agent-tool-filter: профиль «${profileName}» для пресета «${presetId}» отсутствует`)
        return
      }
      clearRestriction(agent) // смена маски: старые disposers снимаются перед новыми
      // auto: история с вызовами скрываемых инструментов → block (список для провайдера
      // не меняется — строгие провайдеры не падают); чистая история → hide (экономия схем).
      const mode = resolveMode(cfg, agent, profile, source)
      dlog('handle', `режим: ${mode}`)
      const tools = (typeof agent?.ctx?.get === 'function' ? agent.ctx.get('tools') : undefined) ?? agent?.ctx?.tools
      const namesBefore = toolNames(tools)
      const denyName = profile.mode === 'deny' ? profile.tools?.[0] : undefined
      const hadDenyBefore = denyName === undefined ? 'n/a' : namesBefore.includes(denyName)
      if (mode === 'block') applyBlock(agent, presetId, profileName, profile, log)
      else applyRestriction(agent, presetId, profileName, profile, log, mode)
      const namesAfter = toolNames(tools)
      const state = readState(agent)
      dlog('handle', `результат: applied=${state?.applied ?? 0}; skipped=${state?.skipped?.length ? state.skipped.join(' | ') : 'нет'}`)
      dlog('handle', `до/после: ${denyName ?? 'deny-инструмент отсутствует'}; до=${hadDenyBefore}; после=${denyName === undefined ? 'n/a' : namesAfter.includes(denyName)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dlog('handle', `ошибка: ${message}`)
      log('warn', `agent-tool-filter: сбой обработки агента — ${message}`)
    }
  }

  return { handle, rootsOf, disposeTimers }
}
