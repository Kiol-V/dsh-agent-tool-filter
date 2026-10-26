// lib/config.mjs — конфигурация фильтра: дефолты, нормализация профилей и матрицы.
// Принцип безопасных дефолтов: матрица по умолчанию ПУСТАЯ — установка не меняет поведение
// существующих пресетов. Пользователь включает фильтрацию связкой «пресет → профиль».

import { errorMessage } from './logger.mjs'

export const DEFAULT_PROFILES = {
  // Единственный универсальный дефолт: админ-инструменты скрыты из любого пресета.
  // Остальные шаблоны (Градиент / По назначению / Слойные) доступны импортом пакетов —
  // см. lib/templates.mjs; пакеты же служат образцами «какие профили можно создавать».
  balanced: {
    mode: 'deny',
    tools: [
      'plugin_manager',
      'security_audit',
      'test_drive',
      'drive_report',
      'create_skill',
      'subagent_fork'
    ]
  }
}

export const DEFAULT_PRESETS = {}

export const RESERVED_NAMES = ['run_code']

// Зарезервированные ключи объекта: имена профилей/пресетов из пользовательского
// ввода не могут совпадать с ними — иначе lookup через прототип (наследуемые
// ключи Object.prototype вроде toString) проходит проверку «профиль существует»
// (тихий fail-open маски), а присваивание `__proto__` меняет прототип объекта.
export const RESERVED_KEYS = ['__proto__', 'constructor', 'prototype']

export function normalizeConfig (config) {
  const notes = []
  const cfg = (config !== null && typeof config === 'object') ? config : {}

  const enabled = cfg.enabled !== false

  const behavior = cfg.behavior === undefined ? 'auto' : String(cfg.behavior).trim().toLowerCase()
  if (behavior !== 'auto' && behavior !== 'hide' && behavior !== 'block') {
    throw new Error(`behavior должен быть 'auto', 'hide' или 'block', получено "${behavior}"`)
  }

  // Язык UI плагина: 'auto' — активная локаль платформы, иначе принудительно ru/en.
  const language = cfg.language === undefined ? 'auto' : String(cfg.language).trim().toLowerCase()
  if (!['auto', 'ru', 'en'].includes(language)) {
    throw new Error(`language должен быть 'auto', 'ru' или 'en', получено "${language}"`)
  }

  // Файловая диагностика (debuglog): тумблер в настройках плагина, по умолчанию ВЫКЛ;
  // env ATF_DEBUG_LOG — принудительный override (включает лог и задаёт путь) — см. lib/debuglog.mjs.
  if (cfg.debugLog !== undefined && typeof cfg.debugLog !== 'boolean') {
    throw new Error(`debugLog должен быть boolean (вкл/выкл файловой диагностики), получено "${typeof cfg.debugLog}"`)
  }
  const debugLog = cfg.debugLog === true

  // Расширенные права субагентов (subagentEscalation): тумблер в настройках плагина,
  // по умолчанию ВЫКЛ — эскалация прав субагентов через апрув пользователя.
  if (cfg.subagentEscalation !== undefined && typeof cfg.subagentEscalation !== 'boolean') {
    throw new Error(`subagentEscalation должен быть boolean (вкл/выкл расширенных прав субагентов), получено "${typeof cfg.subagentEscalation}"`)
  }
  const subagentEscalation = cfg.subagentEscalation === true

  const profiles = { ...DEFAULT_PROFILES }
  if (cfg.profiles !== undefined) {
    if (cfg.profiles === null || typeof cfg.profiles !== 'object' || Array.isArray(cfg.profiles)) {
      throw new Error('profiles должен быть объектом «имя профиля → {mode, tools}»')
    }
    for (const [name, raw] of Object.entries(cfg.profiles)) {
      if (RESERVED_KEYS.includes(name)) {
        notes.push(`профиль "${name}" отброшен: зарезервированное имя`)
        continue
      }
      try {
        profiles[name] = normalizeProfile(raw)
      } catch (error) {
        notes.push(`профиль "${name}" отброшен: ${errorMessage(error)}`)
      }
    }
  }

  const presets = {}
  const rawPresets = cfg.presets === undefined ? DEFAULT_PRESETS : cfg.presets
  if (rawPresets === null || typeof rawPresets !== 'object' || Array.isArray(rawPresets)) {
    throw new Error('presets должен быть объектом «id пресета → имя профиля» (пусто = не применять нигде)')
  }
  for (const [presetId, profileName] of Object.entries(rawPresets)) {
    if (typeof profileName !== 'string' || profileName.trim() === '') {
      notes.push(`пресет "${presetId}": имя профиля пустое — связка пропущена`)
      continue
    }
    if (!Object.hasOwn(profiles, profileName)) {
      notes.push(`пресет "${presetId}": профиль "${profileName}" не найден — пресет не фильтруется`)
      continue
    }
    presets[presetId] = profileName
  }

  return { enabled, behavior, language, debugLog, subagentEscalation, profiles, presets, notes }
}

export function normalizeProfile (raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('профиль должен быть объектом {mode, tools}')
  }
  const mode = raw.mode === undefined ? 'deny' : String(raw.mode).trim().toLowerCase()
  if (mode !== 'deny' && mode !== 'allow') {
    throw new Error(`mode должен быть 'deny' или 'allow', получено "${mode}"`)
  }
  const rawList = Array.isArray(raw.tools) ? raw.tools : []
  const tools = []
  const seen = new Set()
  for (const item of rawList) {
    const name = String(item).trim()
    if (name === '') continue
    if (name.includes('*')) {
      throw new Error(`"${name}": glob-паттерны не поддерживаются (как и в toolFilter)`)
    }
    if (RESERVED_NAMES.includes(name)) {
      throw new Error(`"${name}": зарезервированный транспорт, в фильтре не указывается`)
    }
    if (seen.has(name)) continue
    seen.add(name)
    tools.push(name)
  }
  return { mode, tools }
}
