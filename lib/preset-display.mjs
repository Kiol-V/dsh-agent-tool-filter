// lib/preset-display.mjs — резолв display-текстов пресета из локализационного
// словаря платформы (клиентский неймспейс 'settings.agentPreset', регистрирует
// пакет ui-agent-preset: locales.ts → name/description). Модуль хранит только
// КЛЮЧИ словаря, не тексты: строки читаются живьём через locale.bind(ns) — копия
// всегда совпадает с Settings и берётся в АКТИВНОЙ локали (дрейф исключён).
//
// Семантика шиповых повторяет isBuiltInPreset/presetDisplayText платформы
// (@deepseek-ai/dsh-agent-preset-registry/display): словарь применяется только
// когда пресет не публикует своё имя; пресет со своим name владеет своей копией
// (его name/description копируются из опубликованных метаданных).
//
// Гайд («Mode details»/«How to use») сюда НЕ входит и в копию не переносится:
// платформенные карточки Settings показывают эти ссылки только для шиповых id
// (presetGuide(id, trust) — жёсткий словарь четырёх id, gate `trust === 'system'`),
// поэтому копия (кастомный пресет) получить такие ссылки не может — ограничение
// платформы, а не конфигурации.

// id шипового пресета → ключи его display-копии в словаре 'settings.agentPreset'.
export const BUILT_IN_KEY_MAP = {
  standard: { name: 'presetStandardName', description: 'presetStandardDescription' },
  ptc: { name: 'presetPtcName', description: 'presetPtcDescription' },
  minimal: { name: 'presetMinimalName', description: 'presetMinimalDescription' },
  cordis: { name: 'presetCordisName', description: 'presetCordisDescription' }
}

function translateText (t) {
  // Отсутствующий ключ translate возвращает своим же ключом — так детектируем пропуски.
  return key => {
    const value = t(key)
    return typeof value === 'string' && value !== key ? value : undefined
  }
}

// Общий ворот: шиповый пресет без своего имени (info.name в статусе равен id —
// фолбэк statusFull) и с доступным словарём; иначе undefined.
function builtInTexts (t, presetId, info) {
  if (typeof t !== 'function') return undefined
  const keys = BUILT_IN_KEY_MAP[presetId]
  if (keys === undefined) return undefined
  const published = typeof info?.name === 'string' && info.name !== '' && info.name !== presetId
  if (published) return undefined
  return { keys, text: translateText(t) }
}

/**
 * Короткие display-тексты для копии пресета: {name?, description?} — ровно то,
 * что карточка Settings показывает как имя и описание (без разделов гайда).
 * undefined — словарь неприменим или ничего не резолвилось (вызывающий берёт
 * фолбэк на опубликованные метаданные).
 * @param {Function} t — locale.bind('settings.agentPreset').
 * @param {string} presetId — id пресета-источника.
 * @param {{name?: string}} [info] — строка presetInfo из статуса.
 */
export function resolvePresetDisplay (t, presetId, info) {
  const builtIn = builtInTexts(t, presetId, info)
  if (builtIn === undefined) return undefined
  const { keys, text } = builtIn
  const name = text(keys.name)
  const description = text(keys.description)
  if (name === undefined && description === undefined) return undefined
  return {
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description })
  }
}

/**
 * Display-тексты для копии с полным фолбэком: шиповые — из словаря DSH
 * (resolvePresetDisplay), кастомные — их опубликованные метаданные (name/description
 * строки конфига/roster из presetInfo). undefined — нет ни словаря, ни метаданных.
 * @param {Function|undefined} t — locale.bind('settings.agentPreset'); может быть undefined.
 * @param {string} presetId — id пресета-источника.
 * @param {{name?: string, description?: string}} [info] — строка presetInfo из статуса.
 */
export function resolveCopyDisplay (t, presetId, info) {
  const fromDictionary = resolvePresetDisplay(t, presetId, info)
  if (fromDictionary !== undefined) return fromDictionary
  const name = typeof info?.name === 'string' && info.name.trim() !== '' && info.name !== presetId
    ? info.name
    : undefined
  const description = typeof info?.description === 'string' && info.description.trim() !== ''
    ? info.description
    : undefined
  if (name === undefined && description === undefined) return undefined
  return {
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description })
  }
}
