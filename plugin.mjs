// dsh-agent-tool-filter v1.0.1 — per-agent фильтр инструментов основного агента.
// Тонкая точка входа: собирает модули lib/ (конфиг, ограничения, обработка агентов,
// диагностика, логгер). Механика restrict НЕ меняется.
//
// Механика (подтверждена кодом 0.2.0-rc.2):
// - restrict() требует scoped-контекст → вызываем restrict() из tools-сервиса агента на событии
//   'agent/created' (listeners отрабатывают до первой сборки prompt);
// - только КОРНЕВЫЕ агенты: in-process дети показывают ТОТ ЖЕ composedPreset (composeFrom) —
//   без проверки roots() фильтр задел бы субагентов; SDK-субагенты живут в отдельном процессе;
// - пресет агента: ctx.get('agentPresets').composedPreset(agent.ctx);
// - маски пересекаются → старые disposers снимаются перед новыми (см. lib/restriction.mjs).
//
// Контракт host-плагина: export function apply(ctx, config) + export const inject.
// Typert protocol загружается динамически только при доступном сервисе; host-only запуск остаётся без жёсткой зависимости.

import { makeLogger, errorMessage } from './lib/logger.mjs'
import { makeDebugLog } from './lib/debuglog.mjs'
import { normalizeConfig } from './lib/config.mjs'
import { makeAgentFilter } from './lib/agent-filter.mjs'
import { statusFull, scanTools } from './lib/diagnostics.mjs'
import { scanGlobalTools, classifyProfileTools } from './lib/scan.mjs'
import { clearRestriction } from './lib/restriction.mjs'
import { clientDescriptors } from './lib/remote-descriptors.mjs'
import {
  bindPreset,
  copyPreset,
  deleteProfile,
  deletePreset,
  importPack,
  registerManageContext,
  removeToolName,
  rescan,
  setDebugLog,
  setEnabled,
  setLanguage,
  setProfile,
  unbindPreset
} from './lib/manage.mjs'

export const name = 'agent-tool-filter'

export const inject = ['agents']

function optionalService (ctx, key) {
  try { return ctx?.get?.(key) } catch { return undefined }
}

const remoteContribution = {
  package: 'dsh-agent-tool-filter',
  face: 'host',
  schemas: [],
  invocations: clientDescriptors,
  model: {
    services: [{
      key: 'agentToolFilter',
      exportName: 'AgentToolFilter',
      summary: 'Read and manage per-agent tool filtering.',
      tags: [],
      members: [
        { kind: 'method', name: 'status', signature: 'status(): object' },
        { kind: 'method', name: 'setEnabled', signature: 'setEnabled(enabled: boolean): Promise<object>' },
        { kind: 'method', name: 'setDebugLog', signature: 'setDebugLog(enabled: boolean): Promise<object>' },
        { kind: 'method', name: 'setLanguage', signature: 'setLanguage(language: string): Promise<object>' },
        { kind: 'method', name: 'bindPreset', signature: 'bindPreset(presetId: string, profileName: string): Promise<object>' },
        { kind: 'method', name: 'unbindPreset', signature: 'unbindPreset(presetId: string): Promise<object>' },
        { kind: 'method', name: 'setProfile', signature: 'setProfile(name: string, profile: object): Promise<object>' },
        { kind: 'method', name: 'removeToolName', signature: 'removeToolName(toolName: string): Promise<object>' },
        { kind: 'method', name: 'deleteProfile', signature: 'deleteProfile(name: string): Promise<object>' },
        { kind: 'method', name: 'importPack', signature: 'importPack(packId: string): Promise<object>' },
        { kind: 'method', name: 'copyPreset', signature: 'copyPreset(presetId: string, newName: string, display?: { name?: string, description?: string }): Promise<object>' },
        { kind: 'method', name: 'deletePreset', signature: 'deletePreset(presetId: string): Promise<object>' },
        { kind: 'method', name: 'rescan', signature: 'rescan(): Promise<object>' }
      ],
      types: []
    }],
    events: [],
    objects: []
  }
}

// Каноничная форма binding'а, которую возвращает bindTypertRemote() из
// @deepseek-ai/dsh-typert-protocol (пакет не всегда резолвится в профиле,
// поэтому форма воспроизводится локально): freeze({ service, serviceKey, namespace }).
function makeTypertRemoteBinding (service, serviceKey) {
  return Object.freeze({ service, serviceKey, namespace: serviceKey })
}

export async function provideRemoteApi (ctx, cfg, log) {
  // Опционально: каноничный binding из typert-protocol (если пакет резолвится).
  let bindTypertRemote
  try {
    ({ bindTypertRemote } = await import('@deepseek-ai/dsh-typert-protocol'))
  } catch { /* пакет может не резолвиться в профиле — локальная форма binding'а */ }

  let provided = false
  try {
    // ctx.provide принимает ГОТОВОЕ ЗНАЧЕНИЕ (не фабрику): сервисом должен быть
    // сам объект с typertRemote — иначе gateway видит функцию и отдаёт binding-invalid.
    const service = {
      status: () => statusFull(cfg, ctx),
      scanTools: () => scanTools(cfg, ctx),
      setEnabled: enabled => setEnabled(ctx, enabled),
      setDebugLog: enabled => setDebugLog(ctx, enabled),
      setLanguage: language => setLanguage(ctx, language),
      bindPreset: (presetId, profileName) => bindPreset(ctx, presetId, profileName),
      unbindPreset: presetId => unbindPreset(ctx, presetId),
      setProfile: (name, profile) => setProfile(ctx, name, profile),
      removeToolName: toolName => removeToolName(ctx, toolName),
      deleteProfile: name => deleteProfile(ctx, name),
      importPack: packId => importPack(ctx, packId),
      copyPreset: (presetId, newName, display) => copyPreset(ctx, presetId, newName, display),
      deletePreset: presetId => deletePreset(ctx, presetId),
      rescan: () => rescan(ctx)
    }
    service.typertRemote = typeof bindTypertRemote === 'function'
      ? bindTypertRemote(service, 'agentToolFilter')
      : makeTypertRemoteBinding(service, 'agentToolFilter')
    ctx.provide?.('agentToolFilter', service)
    provided = typeof ctx?.provide === 'function'
  } catch (error) {
    log('warn', `agent-tool-filter: сервисная регистрация недоступна (${errorMessage(error)})`)
  }

  // Регистрация вклада обязательна и НЕ зависит от наличия typert-protocol:
  // без неё gateway отдаёт 404 на все вызовы agentToolFilter/*.
  // ВАЖНО: ctx.get('typert') отдаёт сервис только при ACTIVE-состоянии его fiber
  // (state === 2), поэтому ранний apply проигрывает гонку загрузке typert —
  // ждём сервис каноническим дочерним fiber'ом (ctx.inject).
  const register = ownerCtx => {
    const typert = optionalService(ownerCtx, 'typert')
    const gateway = optionalService(ownerCtx, 'typertGateway')
    if (!gateway) log('warn', 'agent-tool-filter: сервис typertGateway отсутствует; транспорт Remote сейчас недоступен')
    if (!typert || typeof typert.register !== 'function') {
      log('warn', 'agent-tool-filter: сервис typert отсутствует; удалённый API UI недоступен')
      return
    }
    if (!provided) {
      return
    }
    try {
      typert.register(remoteContribution)
      log('info', 'agent-tool-filter: typert Remote-вклад зарегистрирован (agentToolFilter/*)')
    } catch (error) {
      log('warn', `agent-tool-filter: typert Remote-вклад не зарегистрирован (${errorMessage(error)})`)
    }
  }
  if (typeof ctx?.inject === 'function') ctx.inject(['typert'], register)
  else register(ctx)
}

export async function apply (ctx, config) {
  const log = makeLogger(ctx)
  const version = '1.0.1'
  let initialRoots = null
  try { initialRoots = ctx.get('agents')?.roots?.() } catch { /* logged as unavailable below */ }
  let composedPresetType = 'undefined'
  try { composedPresetType = typeof ctx.get('agentPresets')?.composedPreset } catch { /* service unavailable */ }
  let cfg
  try {
    cfg = normalizeConfig(config)
  } catch (error) {
    log('warn', `agent-tool-filter: конфиг не прошёл проверку (${errorMessage(error)}), фильтр отключён`)
    return
  }
  const dlog = makeDebugLog({ enabled: () => cfg.debugLog === true })
  dlog('apply', `version=${version}; composedPreset=${composedPresetType}; roots=${Array.isArray(initialRoots) ? initialRoots.length : 'null'}`)
  for (const note of cfg.notes) log('warn', `agent-tool-filter: ${note}`)

  const sourceByAgent = new WeakMap()
  const presetByAgent = new WeakMap()
  const { handle, rootsOf, disposeTimers } = makeAgentFilter(ctx, cfg, log, dlog, presetByAgent)
  const reapply = () => {
    const roots = rootsOf()
    dlog('reapply', `roots ${roots === null ? 'null' : roots.length}`)
    if (roots === null) return
    for (const agent of roots) {
      if (cfg.enabled) handle(agent)
      else clearRestriction(agent)
    }
  }
  registerManageContext(ctx, {
    initialConfig: config,
    getConfig: () => cfg,
    setConfig: next => {
      for (const key of Object.keys(cfg)) delete cfg[key]
      Object.assign(cfg, next)
    },
    reapply
  })

  if (!cfg.enabled) {
    log('info', 'agent-tool-filter: отключён конфигурацией (enabled: false)')
  } else {
    // Сканирование установленного DSH: сверка профилей с реальным набором tools.
    const scan = scanGlobalTools(ctx)
    const classified = classifyProfileTools(cfg.profiles, scan.names, scan.restrictable)
    for (const text of classified.notes) log('warn', `agent-tool-filter: ${text}`)
    log('info', `agent-tool-filter: сканирование — tools в DSH: ${scan.names.length}${scan.available ? '' : ' (реестр недоступен)'}; профили: ${classified.summary.join('; ') || 'нет'}`)
  }

  // Горячая активация и конфигурационные обновления используют один путь re-apply.
  reapply()
  const disposers = []
  const off = ctx.on('agent/created', ({ agent, source }) => {
    dlog('event', `created: ${agent?.id ?? 'undefined'}`)
    sourceByAgent.set(agent, source)
    if (cfg.enabled) handle(agent, source)
    else clearRestriction(agent)
  })
  if (typeof off === 'function') disposers.push(off)
  const offPresetSelected = ctx.on('agent-preset/selected', (sessionId, presetId) => {
    let agent
    let lookup = 'ctx.get'
    try { agent = ctx.get('agents')?.get?.(sessionId) } catch { /* try roots fallback */ }
    if (!agent) {
      lookup = 'roots'
      const roots = rootsOf()
      if (roots !== null) agent = roots.find(root => root?.id === sessionId)
    }
    dlog('event', `preset-selected: sessionId=${sessionId}; presetId=${presetId}; агент ${agent ? `найден (${lookup})` : 'не найден'}`)
    if (!agent) return
    if (presetId !== undefined) presetByAgent.set(agent, presetId)
    if (cfg.enabled) handle(agent, sourceByAgent.get(agent) ?? 'startup')
    else clearRestriction(agent)
  })
  if (typeof offPresetSelected === 'function') disposers.push(offPresetSelected)
  const offCompaction = ctx.on('session/event', (session, event) => {
    if (event?.type !== 'compaction/end' || event?.data?.error !== undefined) return
    dlog('event', `compaction/end: session=${session?.id ?? 'undefined'} — пере-оценка режима`)
    let agent
    try { agent = ctx.get('agents')?.get?.(session.id) } catch { /* roots fallback */ }
    if (!agent) {
      const roots = rootsOf()
      if (roots !== null) agent = roots.find(root => root?.id === session.id)
    }
    if (!agent) return
    if (cfg.enabled) handle(agent, 'compact')
    else clearRestriction(agent)
  })
  if (typeof offCompaction === 'function') disposers.push(offCompaction)
  const offReload = ctx.on('app-boot/config-reload', reapply)
  if (typeof offReload === 'function') disposers.push(offReload)

  // Сервис host API и Remote binding для UI — оба опциональны в headless-средах.
  await provideRemoteApi(ctx, cfg, log)

  if (cfg.enabled) {
    const bound = Object.entries(cfg.presets).map(([preset, profile]) => `${preset} → ${profile}`).join(', ')
    if (bound === '') {
      log('info', `agent-tool-filter: активен, но фильтрация выключена — матрица пуста (профилей готово: ${Object.keys(cfg.profiles).length}); включите связкой «пресет → профиль» в config.presets`)
    } else {
      const scan = scanGlobalTools(ctx)
      const classified = classifyProfileTools(cfg.profiles, scan.names, scan.restrictable)
      log('info', `agent-tool-filter: активен (пресеты: ${bound}; профилей: ${Object.keys(cfg.profiles).length}; предупреждений скана: ${classified.notes.length})`)
    }
  }

  // Контракт v4 (K5): async apply возвращает disposer — подписки снимаются при
  // выгрузке плагина; маски живых агентов снимает clearRestriction по конфигу.
  return () => {
    disposeTimers()
    for (const dispose of disposers) {
      try { dispose() } catch { /* подписка уже снята контекстом */ }
    }
  }
}

