// lib/manage.mjs — host-side write API for configuration and tool diagnostics.

import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DEFAULT_PROFILES, RESERVED_NAMES, normalizeConfig, normalizeProfile } from './config.mjs'
import { presetIds, statusFull } from './diagnostics.mjs'
import { errorMessage } from './logger.mjs'
import { classifyProfileTools, scanGlobalTools } from './scan.mjs'
import { findInsertRowItem, removeRowItem, serializeInsertRow } from './serializer.mjs'
import { PROFILE_PACKS } from './templates.mjs'

const runtimeByContext = new WeakMap()

export function registerManageContext (ctx, runtime) {
  if (ctx !== null && (typeof ctx === 'object' || typeof ctx === 'function')) {
    const initial = normalizeConfig(runtime.initialConfig)
    runtimeByContext.set(ctx, {
      runtime,
      entry: ctx?.fiber?.entry,
      profileOverrides: new Set(Object.keys(configForStorage(initial).profiles))
    })
  }
}

function errorResult (error, field) {
  const result = { ok: false, error: error instanceof Error ? error.message : String(error) }
  const errorField = field ?? error?.field
  if (errorField) result.field = errorField
  return result
}

function runtimeConfig (ctx) {
  const state = runtimeByContext.get(ctx)
  if (!state) throw new Error('сервис agentToolFilter недоступен')
  return normalizeConfig(state.runtime.getConfig())
}

function getConfigEditor (ctx) {
  try {
    return ctx?.get?.('configEditor')
  } catch {
    return undefined
  }
}

function entryMatches (item) {
  if (!item || typeof item !== 'object') return false
  const ids = [item.id, item?.options?.id]
  const names = [item.name, item?.options?.name]
  return ids.includes('agent-tool-filter')
    || names.includes('dsh-agent-tool-filter')
    || ids.some(value => typeof value === 'string' && value.endsWith(':agent-tool-filter'))
}

function validateConfigEditor (ctx, state) {
  const editor = getConfigEditor(ctx)
  if (!editor || typeof editor.entries !== 'function' || typeof editor.edit !== 'function') {
    throw new Error('configEditor недоступен')
  }
  const entries = editor.entries()
  if (!Array.isArray(entries)) throw new Error('configEditor.entries() вернул некорректный список')
  // Каноническая идентичность — сам Entry нашего fiber: id строки в составном дереве
  // может нести префиксы слоёв (через ':'), поэтому поиск по имени — только фолбэк.
  const entry = state?.entry ?? entries.find(entryMatches)
  if (!entry) {
    const ids = entries.map(item => item?.id ?? item?.options?.id ?? '?').join(', ')
    throw new Error(`запись agent-tool-filter не найдена в configEditor (доступны id: ${ids})`)
  }
  return { editor, entry }
}

function withWarnings (config, ctx) {
  const scan = scanGlobalTools(ctx)
  return classifyProfileTools(config.profiles, scan.names, scan.restrictable).notes
}

async function successResult (config, ctx, extras = {}) {
  return {
    ok: true,
    config,
    status: await statusFull(config, ctx),
    ...extras
  }
}

function sameProfile (profile, defaultProfile) {
  return profile.mode === defaultProfile.mode
    && profile.tools.length === defaultProfile.tools.length
    && profile.tools.every((tool, index) => tool === defaultProfile.tools[index])
}

function configForStorage (config) {
  const { notes, ...storedConfig } = config
  const profiles = Object.fromEntries(Object.entries(storedConfig.profiles).filter(([name, profile]) => {
    const defaultProfile = DEFAULT_PROFILES[name]
    return defaultProfile === undefined || !sameProfile(profile, defaultProfile)
  }))
  return { ...storedConfig, profiles }
}

async function persist (ctx, update) {
  let state
  let runtime
  let candidate
  let editorInfo
  try {
    state = runtimeByContext.get(ctx)
    runtime = state?.runtime
    if (!runtime) throw new Error('сервис agentToolFilter недоступен')
    const before = runtimeConfig(ctx)
    // Validate and prepare before calling edit: invalid input is never a write transaction.
    candidate = normalizeConfig(update(before))
    editorInfo = validateConfigEditor(ctx, state)
  } catch (error) {
    return errorResult(error)
  }

  let committed
  const change = (rawConfig) => {
    const base = normalizeConfig(rawConfig ?? candidate)
    committed = normalizeConfig(update(base))
    return configForStorage(committed)
  }

  try {
    await editorInfo.editor.edit(editorInfo.entry, change)
    const config = committed ?? candidate
    runtime.setConfig(config)
    state.profileOverrides = new Set(Object.keys(configForStorage(config).profiles))
    runtime.reapply?.()
    return successResult(config, ctx, { warnings: withWarnings(config, ctx) })
  } catch (error) {
    return errorResult(error)
  }
}

function nonEmptyString (value, field, label = field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`${label} должен быть непустой строкой`), { field })
  }
  return value.trim()
}

function validateProfile (profileInput) {
  if (profileInput === null || typeof profileInput !== 'object' || Array.isArray(profileInput)) {
    throw Object.assign(new Error('профиль должен содержать mode и tools'), { field: 'profile' })
  }
  const mode = typeof profileInput.mode === 'string' ? profileInput.mode.trim().toLowerCase() : ''
  if (mode !== 'deny' && mode !== 'allow') {
    throw Object.assign(new Error("mode должен быть 'deny' или 'allow'"), { field: 'mode' })
  }
  if (!Array.isArray(profileInput.tools)) {
    throw Object.assign(new Error('tools должен быть массивом имён инструментов'), { field: 'tools' })
  }
  for (const item of profileInput.tools) {
    const name = String(item).trim()
    if (/[?*]/.test(name)) {
      throw Object.assign(new Error(`glob-имена не поддерживаются: "${name}"; перечисляйте точные имена`), { field: 'tools' })
    }
    if (RESERVED_NAMES.includes(name)) {
      throw Object.assign(new Error(`"${name}": зарезервированный транспорт, в фильтре не указывается`), { field: 'tools' })
    }
  }
  let profile
  try {
    profile = normalizeProfile({ mode, tools: profileInput.tools })
  } catch (error) {
    throw Object.assign(error, { field: 'tools' })
  }
  if (profile.tools.length === 0) {
    throw Object.assign(new Error('tools не может быть пустым для mode deny или allow'), { field: 'tools' })
  }
  return profile
}

function resultForCaught (error, fallbackField) {
  return errorResult(error, error?.field ?? fallbackField)
}

export async function setEnabled (ctx, enabled) {
  if (typeof enabled !== 'boolean') return errorResult(new Error('enabled должен быть boolean'), 'enabled')
  return persist(ctx, config => ({ ...config, enabled }))
}

export async function setDebugLog (ctx, enabled) {
  if (typeof enabled !== 'boolean') return errorResult(new Error('enabled должен быть boolean'), 'enabled')
  return persist(ctx, config => ({ ...config, debugLog: enabled }))
}

// Язык UI плагина: 'auto' — активная локаль платформы, иначе принудительно ru/en.
export async function setLanguage (ctx, language) {
  let lang
  try {
    lang = nonEmptyString(language, 'language', 'language').toLowerCase()
    if (!['auto', 'ru', 'en'].includes(lang)) {
      throw Object.assign(new Error("language должен быть 'auto', 'ru' или 'en'"), { field: 'language' })
    }
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => ({ ...config, language: lang }))
}

export async function bindPreset (ctx, presetId, profileName) {
  let preset
  let profile
  try {
    preset = nonEmptyString(presetId, 'presetId', 'presetId')
    profile = nonEmptyString(profileName, 'profileName', 'profileName')
    const config = runtimeConfig(ctx)
    if (config.profiles[profile] === undefined) {
      throw Object.assign(new Error(`профиль "${profile}" не найден`), { field: 'profileName' })
    }
    if (!(await presetIds(ctx)).includes(preset)) {
      throw Object.assign(new Error(`пресет "${preset}" не найден в agentPresets`), { field: 'presetId' })
    }
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => ({ ...config, presets: { ...config.presets, [preset]: profile } }))
}

export async function unbindPreset (ctx, presetId) {
  let preset
  try {
    preset = nonEmptyString(presetId, 'presetId', 'presetId')
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => {
    const presets = { ...config.presets }
    delete presets[preset]
    return { ...config, presets }
  })
}

export async function setProfile (ctx, name, profileInput) {
  let profileName
  let profile
  try {
    profileName = nonEmptyString(name, 'name', 'name')
    profile = validateProfile(profileInput)
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => ({
    ...config,
    profiles: { ...config.profiles, [profileName]: profile }
  }))
}

// Удаление имени tool из всех профилей — быстрый фикс опечаток и удалённых плагинов
// прямо из блока «Предупреждения» (кнопка «Убрать имя из профиля»).
export async function removeToolName (ctx, toolName) {
  let name
  try {
    name = nonEmptyString(toolName, 'toolName', 'toolName')
    const config = runtimeConfig(ctx)
    const affected = Object.entries(config.profiles).filter(([, profile]) => profile.tools.includes(name))
    if (affected.length === 0) {
      throw Object.assign(new Error(`имя "${name}" не найдено в профилях`), { field: 'toolName' })
    }
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => {
    const profiles = {}
    for (const [profileName, profile] of Object.entries(config.profiles)) {
      profiles[profileName] = profile.tools.includes(name)
        ? { ...profile, tools: profile.tools.filter(tool => tool !== name) }
        : profile
    }
    return { ...config, profiles }
  })
}

export async function deleteProfile (ctx, name) {
  let profileName
  try {
    profileName = nonEmptyString(name, 'name', 'name')
    const state = runtimeByContext.get(ctx)
    const config = runtimeConfig(ctx)
    const isBuiltIn = DEFAULT_PROFILES[profileName] !== undefined
    if (isBuiltIn && !state?.profileOverrides.has(profileName)) {
      throw Object.assign(new Error('встроенный профиль не удаляется (override отсутствует)'), { field: 'name' })
    }
    if (!isBuiltIn && config.profiles[profileName] === undefined) {
      throw Object.assign(new Error(`профиль "${profileName}" не найден`), { field: 'name' })
    }
    if (!isBuiltIn) {
      const usedBy = Object.entries(config.presets)
        .filter(([, boundProfile]) => boundProfile === profileName)
        .map(([boundPreset]) => boundPreset)
      if (usedBy.length > 0) {
        throw Object.assign(new Error(`профиль "${profileName}" используется пресетами: ${usedBy.join(', ')}`), { field: 'name' })
      }
    }
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => {
    const profiles = { ...config.profiles }
    delete profiles[profileName]
    return { ...config, profiles }
  })
}

// Путь профильного patch: documentPath configEditor (собственная персистентность
// платформы) либо DSH_PROFILE_DIR окружения хоста.
function resolveProfilePatchPath (editor) {
  const documentPath = editor?.documentPath
  if (typeof documentPath === 'string' && documentPath !== '') return documentPath
  const dir = process.env.DSH_PROFILE_DIR
  if (typeof dir === 'string' && dir !== '') return join(dir, 'cordis.patch.yml')
  return undefined
}

function firstNonEmpty (...values) {
  return values.find(value => typeof value === 'string' && value.trim() !== '')
}

// Название и описание пресета: слитая конфигурация (с name/description) живёт в
// реестре agentPresets — его читает и Settings; строка configEditor — сырой override
// слоя и часто несёт только {id, order, plugins}. Не бросает: реестр — фолбэк-источник.
async function presetRosterRow (ctx, presetId) {
  try {
    const service = ctx?.get?.('agentPresets')
    if (!service || typeof service.list !== 'function') return undefined
    const listed = await service.list()
    const rows = Array.isArray(listed) ? listed : (listed?.presets ?? [])
    return rows.find(row => row?.id === presetId)
  } catch { /* реестр пресетов недоступен */ }
  return undefined
}

// Копия пресета: полная custom-копия объявления из конфига (минуя Settings → Agent Presets).
// Источник — строка-объявление пресета в дереве конфига (config: {id, name, description,
// order, plugins}). Персистентность — insert-строка, ДОПИСЫВАЕМАЯ в профильный patch
// (текст файла не переписывается — комментарии целы; формат повторяет платформенные
// объявления пресетов). Без файла строка жила бы только в памяти и исчезала бы при
// первой перестройке дерева (например при смене дефолтного пресета).
export async function copyPreset (ctx, presetId, newName, display) {
  let created
  let targetTree
  try {
    const state = runtimeByContext.get(ctx)
    const preset = nonEmptyString(presetId, 'presetId', 'presetId')
    const wantedName = nonEmptyString(newName, 'newName', 'newName')
    if (display !== undefined && display !== null
      && (typeof display !== 'object' || Array.isArray(display))) {
      throw Object.assign(new Error('display должен быть объектом {name?, description?}'), { field: 'display' })
    }
    const editor = getConfigEditor(ctx)
    const entries = editor?.entries?.()
    if (!Array.isArray(entries)) throw new Error('configEditor недоступен')

    const source = entries.find(item => item?.options?.config?.id === preset)
    if (!source) throw Object.assign(new Error(`объявление пресета "${preset}" не найдено в конфиге`), { field: 'presetId' })

    // id копии: платформа требует только непустой id — алфавит не нормируется
    // (кириллица/китайский допустимы); фолбэк — суффикс для имён из одних символов.
    const slug = wantedName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
    const id = slug === '' ? `preset-copy-${Date.now().toString(36)}` : slug
    const rowId = `preset-${id}`
    const takenIds = new Set([
      ...entries.map(item => item?.id ?? item?.options?.id),
      ...entries.map(item => item?.options?.config?.id)
    ])
    if (takenIds.has(rowId) || takenIds.has(id)) {
      throw Object.assign(new Error(`пресет с id "${id}" уже существует`), { field: 'newName' })
    }

    const definition = source.options.config
    const copy = structuredClone(definition)
    copy.id = id
    copy.name = wantedName
    // Название и описание копии. Приоритет источников:
    // 1) display из клиента — локализованные display-тексты из словаря DSH
    //    (resolvePresetDisplay по locale.bind('settings.agentPreset'); для шиповых
    //    пресетов это единственный источник — они не публикуют name/description);
    // 2) опубликованные метаданные (roster agentPresets, затем поля строки конфига) —
    //    кастомные пресеты и фолбэк без словаря;
    // 3) только строка «Копия <название>».
    const roster = await presetRosterRow(ctx, preset)
    const publishedName = firstNonEmpty(roster?.name, definition.name)
    const publishedDescription = firstNonEmpty(roster?.description, definition.description)
    const title = firstNonEmpty(display?.name, publishedName, preset)
    const body = firstNonEmpty(display?.description, publishedDescription)
    copy.description = body === undefined ? `Копия ${title}` : `Копия ${title}\n${body}`

    // Дерево назначения — профильный patch: дерево нашей собственной строки конфига.
    targetTree = state?.entry?.parent?.tree
    if (!targetTree || typeof targetTree.create !== 'function') {
      throw new Error('прочитать дерево профильного patch нельзя; копия пресета не создана')
    }
    created = await targetTree.create({ id: rowId, name: source.options.name, config: copy })

    const patchPath = resolveProfilePatchPath(editor)
    if (patchPath === undefined) {
      await targetTree.remove?.(created)
      throw new Error('не удалось определить путь профильного patch — копия пресета не сохранена')
    }
    try {
      await appendFile(patchPath, `\n${serializeInsertRow({ id: rowId, name: source.options.name, config: copy })}`, 'utf8')
    } catch (error) {
      await targetTree.remove?.(created)
      throw new Error(`копия пресета не сохранена в профильный patch: ${errorMessage(error)}`)
    }
  } catch (error) {
    return resultForCaught(error)
  }
  return {
    ok: true,
    presetId: created ?? `preset-${newName}`,
    config: runtimeConfig(ctx),
    status: await statusFull(runtimeConfig(ctx), ctx)
  }
}

// Удаление custom-пресета: строка-объявление убирается из профильного patch
// (встроенные пресеты живут в слоях бандлов — их удалить нельзя, кнопка для них
// и не показывается). Связи матрицы на удалённый пресет отбрасываются нормализацией.
export async function deletePreset (ctx, presetId) {
  let targetTree
  try {
    const state = runtimeByContext.get(ctx)
    const preset = nonEmptyString(presetId, 'presetId', 'presetId')
    const editor = getConfigEditor(ctx)
    const entries = editor?.entries?.()
    if (!Array.isArray(entries)) throw new Error('configEditor недоступен')
    const source = entries.find(item => item?.options?.config?.id === preset)
    if (!source) throw Object.assign(new Error(`объявление пресета "${preset}" не найдено в конфиге`), { field: 'presetId' })
    const rowId = source.options.id
    const patchPath = resolveProfilePatchPath(editor)
    if (patchPath === undefined) throw new Error('не удалось определить путь профильного patch')
    const text = await readFile(patchPath, 'utf8')
    if (findInsertRowItem(text, rowId) === null) {
      // Plain-строка с таким id — override базового пресета (правки через Settings),
      // а не custom-объявление: удаление недоступно.
      throw Object.assign(new Error(`пресет "${preset}" — базовый (объявлен вне профильного patch), удаление недоступно`), { field: 'presetId' })
    }
    // Порядок: сначала файл (долговечность), затем живое дерево.
    await writeFile(patchPath, removeRowItem(text, rowId), 'utf8')
    targetTree = state?.entry?.parent?.tree
    await targetTree?.remove?.(rowId)
  } catch (error) {
    return resultForCaught(error)
  }
  return {
    ok: true,
    presetId,
    config: runtimeConfig(ctx),
    status: await statusFull(runtimeConfig(ctx), ctx)
  }
}

// Импорт пакета-шаблона профилей: одна транзакция записи (частичный импорт недопустим).
// Существующие профили с теми же именами перезаписываются содержимым пакета.
export async function importPack (ctx, packId) {
  let profiles
  try {
    if (typeof packId !== 'string' || packId.trim() === '') {
      throw Object.assign(new Error('packId должен быть непустой строкой'), { field: 'packId' })
    }
    const pack = PROFILE_PACKS[packId.trim()]
    if (pack === undefined) {
      throw Object.assign(new Error(`пакет "${packId}" не найден (доступны: ${Object.keys(PROFILE_PACKS).join(', ')})`), { field: 'packId' })
    }
    profiles = {}
    for (const [name, raw] of Object.entries(pack.profiles)) profiles[name] = validateProfile(raw)
  } catch (error) {
    return resultForCaught(error)
  }
  return persist(ctx, config => ({ ...config, profiles: { ...config.profiles, ...profiles } }))
}

export async function rescan (ctx) {
  try {
    const config = runtimeConfig(ctx)
    const scan = scanGlobalTools(ctx)
    const classified = classifyProfileTools(config.profiles, scan.names, scan.restrictable)
    return successResult(config, ctx, {
      result: {
        available: scan.available,
        names: scan.names,
        report: classified.report,
        summary: classified.summary,
        notes: classified.notes
      },
      warnings: classified.notes
    })
  } catch (error) {
    return errorResult(error)
  }
}
