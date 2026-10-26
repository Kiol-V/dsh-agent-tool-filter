// lib/diagnostics.mjs — валидация имён tools и диагностика скрытых схем.
// Публичного списка restrictableNames платформа не выдаёт: имена сверяются с глобальным
// представлением реестра (schemas()), а окончательный вердикт выносит restrict() при
// применении. Неизвестные и own-layer имена (team_*) попадают в предупреждения, а не
// в тихий пропуск.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readState } from './restriction.mjs'
import { resolveLogPath } from './debuglog.mjs'
import { RESERVED_NAMES } from './config.mjs'
import { classifyProfileTools, scanGlobalTools, toolUniverse } from './scan.mjs'
import { findInsertRowItem } from './serializer.mjs'
import { packSummaries } from './templates.mjs'

export function validateNameItems (cfg, ctx) {
  let universe = null
  try {
    // Полная палитра установленного DSH (см. scan.mjs): scoped-инструменты пресетов
    // (plugin_manager, web_*, subagent/team) не должны давать ложных «не найдено».
    const found = toolUniverse(ctx)
    if (found.available) universe = found
  } catch { /* без списка имён валидация ограничится restrict() */ }

  // ❌ (unconfirmed/registry) — actionable: имя → профили, по строке на имя.
  // Имена «нельзя отключить» (own-layer) сюда НЕ входят: они не привязаны к профилям
  // и показываются сводкой по палитре (см. statusFull, «Предупреждения»).
  const bad = new Map()
  const restrictable = universe === null ? null : new Set(universe.restrictable)
  for (const [profileName, profile] of Object.entries(cfg.profiles)) {
    for (const toolName of profile.tools) {
      if (universe !== null) {
        if (restrictable.has(toolName)) continue
        if (universe.names.includes(toolName)) continue
      }
      if (!bad.has(toolName)) bad.set(toolName, [])
      bad.get(toolName).push(profileName)
    }
  }
  const reason = universe === null
    ? '— реестр tools недоступен, имя не проверено — повторите сканирование'
    : '— не найдено: проверьте имя (опечатка?) или инструмент не установлен/отключён'
  const items = []
  for (const [toolName, profileNames] of bad) {
    items.push({
      type: 'unknown',
      tool: toolName,
      profiles: profileNames,
      text: `❌ ${toolName} ${reason} · профили: ${profileNames.join(', ')}`
    })
  }
  return items
}

export function validateNames (cfg, ctx) {
  return validateNameItems(cfg, ctx).map(item => item.text)
}

// Итоговые предупреждения карточки (два типа, решение 2026-10-17):
//   ⚠ «нельзя отключить» — сводка по ПАЛИТРЕ (не по профилям): имена всегда
//     доступны агенту, фильтр их не ограничивает; список — здесь, счётчики — в скане;
//   ❌ «не найдено» — по-именно с профилями: опечатка/удалённый плагин (validateNames).
// Структурированные предупреждения для UI: с кнопкой «Убрать имя из профиля»
// у ❌-варнов (не найдено — опечатка/удалённый плагин). Строковая форма
// (buildWarnings) — производная от items, тексты не дублируются.
export function buildWarningItems (cfg, ctx, lockedNames) {
  const items = []
  if (Array.isArray(lockedNames) && lockedNames.length > 0) {
    items.push({
      type: 'locked',
      tool: undefined,
      profiles: [],
      text: `⚠ нельзя отключить (${lockedNames.length}): ${lockedNames.join(', ')} — всегда доступны агенту, фильтр их не ограничивает`
    })
  }
  return [...items, ...validateNameItems(cfg, ctx)]
}

export function buildWarnings (cfg, ctx, lockedNames) {
  return buildWarningItems(cfg, ctx, lockedNames).map(item => item.text)
}

export function status (cfg, ctx) {
  const agents = []
  try {
    for (const agent of ctx.get('agents')?.list?.() ?? []) {
      const state = readState(agent)
      if (state === undefined) continue
      const { disposers, ...rest } = state
      agents.push({ id: agent.id, ...rest })
    }
  } catch { /* список агентов недоступен */ }
  return {
    enabled: cfg.enabled,
    language: cfg.language,
    debugLog: cfg.debugLog,
    subagentEscalation: cfg.subagentEscalation,
    debugLogPath: resolveLogPath(),
    presets: cfg.presets,
    profiles: cfg.profiles,
    agents
  }
}

// Список доступных пресетов агентов (для селекта «пресет → профиль» в UI).
// Не бросает: неполнота списка — не повод ломать статус.
export async function presetIds (ctx) {
  let service
  try { service = ctx?.get?.('agentPresets') } catch { /* недоступен */ }
  if (!service || typeof service.list !== 'function') return []
  try {
    const listed = await service.list()
    if (Array.isArray(listed)) return listed.map(item => typeof item === 'string' ? item : item?.id).filter(value => typeof value === 'string')
    if (listed && typeof listed === 'object') return Object.keys(listed)
  } catch { /* список пресетов недоступен */ }
  return []
}

// Полный снимок для UI-карточки: статус + доступные пресеты + реестр tools + предупреждения
// + отчёт сканирования (Р1: данные вычисляются при каждом чтении — карточке не нужны
// ручные обновления, состояние свежее и после старта DSH).
export async function statusFull (cfg, ctx) {
  // Полная палитра tools собирается из view(scope) реестра: knownNames — все известные
  // (глобальные + scoped + own-layer), restrictableNames — те, что примет restrict()
  // («можно отключить»); всё остальное — «нельзя» (own-layer остаются видимыми всегда).
  // Scope — сам объект агента; глобальный view берётся без scope.
  const toolsService = ctx.get('tools')
  const known = new Set()
  const restrictable = new Set()
  const collect = view => {
    if (view === null || typeof view !== 'object') return
    for (const name of view.knownNames ?? []) known.add(name)
    for (const name of view.restrictableNames ?? []) restrictable.add(name)
  }
  try { collect(toolsService?.view?.()) } catch { /* глобальный view недоступен */ }
  try {
    const agents = ctx.get('agents')?.list?.() ?? []
    for (const agent of agents) {
      // Каждый scope — отдельно: падение одного не должно обрывать сбор остальных.
      try { collect(toolsService?.view?.(agent)) } catch { /* view этого агента недоступен */ }
    }
  } catch { /* список агентов недоступен */ }
  if (known.size === 0) {
    // Фолбэк без view(): глобальный реестр — всё известное считаем ограничителем.
    try {
      for (const schema of toolsService?.schemas?.() ?? []) if (schema?.name) {
        known.add(schema.name)
        restrictable.add(schema.name)
      }
    } catch { /* реестр недоступен */ }
  }
  const tools = [...known].sort()
  const lockedNames = [...new Set([...tools.filter(name => !restrictable.has(name)), ...RESERVED_NAMES])].sort()
  const scan = scanGlobalTools(ctx)
  const classified = classifyProfileTools(cfg.profiles, scan.names, scan.restrictable)
  // Какие пресеты удаляемы (строка-объявление живёт в профильном patch) —
  // встроенные объявлены слоями бандлов и удалению не подлежат.
  const presetInfo = {}
  // Опубликованные метаданные пресетов (roster agentPresets) — источник описаний
  // для custom-пресетов при копировании (шиповые идут через display-словарь клиента).
  let rosterRows = []
  try {
    const service = ctx.get('agentPresets')
    const listed = await service?.list?.()
    if (Array.isArray(listed)) rosterRows = listed.filter(row => row !== null && typeof row === 'object')
  } catch { /* реестр пресетов недоступен */ }
  try {
    const editor = ctx.get('configEditor')
    const dir = process.env.DSH_PROFILE_DIR
    const patchPath = typeof editor?.documentPath === 'string' && editor.documentPath !== ''
      ? editor.documentPath
      : (typeof dir === 'string' && dir !== '' ? join(dir, 'cordis.patch.yml') : undefined)
    const text = patchPath === undefined ? '' : await readFile(patchPath, 'utf8')
    for (const item of editor?.entries?.() ?? []) {
      const id = item?.options?.config?.id
      if (typeof id !== 'string') continue
      const config = item.options.config
      const rosterRow = rosterRows.find(row => row?.id === id)
      const description = [rosterRow?.description, config.description]
        .find(value => typeof value === 'string' && value.trim() !== '')
      presetInfo[id] = {
        rowId: item.options.id,
        name: typeof config.name === 'string' ? config.name : id,
        ...(description === undefined ? {} : { description }),
        deletable: findInsertRowItem(text, item.options.id) !== null
      }
    }
  } catch { /* инвентарь пресетов недоступен */ }
  let version
  try {
    version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch { /* версия пакета недоступна */ }
  return {
    ...status(cfg, ctx),
    version,
    presetIds: await presetIds(ctx),
    presetInfo,
    tools,
    lockedTools: lockedNames,
    packs: packSummaries(),
    warnings: buildWarnings(cfg, ctx, lockedNames),
    warningItems: buildWarningItems(cfg, ctx, lockedNames),
    report: {
      available: scan.available,
      names: scan.names,
      groups: {
        controllable: [...restrictable].sort(),
        locked: lockedNames
      },
      report: classified.report,
      summary: classified.summary,
      notes: classified.notes
    }
  }
}

export function scanTools (cfg, ctx) {
  let globalNames = []
  try {
    globalNames = (ctx.get('tools')?.schemas?.() ?? []).map(schema => schema?.name).filter(Boolean).sort()
  } catch { /* реестр недоступен */ }
  return {
    tools: globalNames,
    warnings: validateNames(cfg, ctx)
  }
}
