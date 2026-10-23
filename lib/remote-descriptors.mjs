// Shared Typert Remote descriptors for the host and client package faces.

const SRC_JSON = Object.freeze({ mode: 'src-json' })

function strictCodec (typeName, parse) {
  return Object.freeze({
    mode: 'strict',
    typeSymbol: `dsh-agent-tool-filter#${typeName}`,
    create: () => Object.freeze({ parse })
  })
}

const STRING = strictCodec('String', value => {
  if (typeof value !== 'string') throw new TypeError('expected a string')
  return value
})

const BOOLEAN = strictCodec('Boolean', value => {
  if (typeof value !== 'boolean') throw new TypeError('expected a boolean')
  return value
})

const PROFILE_INPUT = strictCodec('ProfileInput', value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('expected a profile object')
  }
  if (value.mode !== 'deny' && value.mode !== 'allow') {
    throw new TypeError('mode must be "deny" or "allow"')
  }
  if (!Array.isArray(value.tools) || !value.tools.every(tool => typeof tool === 'string')) {
    throw new TypeError('tools must be an array of strings')
  }
  return value
})

// Опциональные display-тексты копии пресета (локализованные, из словаря DSH).
// Отсутствие (undefined/null) допустимо: вызывающий берёт фолбэк-цепочку.
const DISPLAY_INPUT = strictCodec('DisplayInput', value => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('expected a display object')
  }
  for (const key of ['name', 'description']) {
    const item = value[key]
    if (item !== undefined && typeof item !== 'string') {
      throw new TypeError(`display.${key} must be a string`)
    }
  }
  return value
})

// Язык UI плагина: 'auto' (активная локаль платформы) или принудительно 'ru'/'en'.
const LANGUAGE_INPUT = strictCodec('LanguageInput', value => {
  if (value !== 'auto' && value !== 'ru' && value !== 'en') {
    throw new TypeError('language must be "auto", "ru" or "en"')
  }
  return value
})

function parameter (name, codec = STRING, options = {}) {
  return Object.freeze({
    name,
    wire: name,
    source: 'json',
    codec,
    // Штатная опциональность gateway: поле можно опустить (строгий codec
    // возвращает undefined — см. decode() в api/gateway).
    ...(options.optional === true ? { acceptsUndefined: true } : {})
  })
}

function descriptor (method, parameters = []) {
  return Object.freeze({
    id: `dsh-agent-tool-filter#agentToolFilter/${method}`,
    service: 'agentToolFilter',
    namespace: 'agentToolFilter',
    method,
    invocation: Object.freeze({ kind: 'direct' }),
    parameters: Object.freeze(parameters),
    result: SRC_JSON
  })
}

// Host registration and Client $mount share strict input codecs. The Gateway
// calls create().parse(value); results remain src-json because they are dynamic JSON.
export const remoteDescriptors = Object.freeze([
  descriptor('setEnabled', [parameter('enabled', BOOLEAN)]),
  descriptor('setDebugLog', [parameter('enabled', BOOLEAN)]),
  descriptor('setLanguage', [parameter('language', LANGUAGE_INPUT)]),
  descriptor('bindPreset', [parameter('presetId'), parameter('profileName')]),
  descriptor('unbindPreset', [parameter('presetId')]),
  descriptor('setProfile', [parameter('name'), parameter('profile', PROFILE_INPUT)]),
  descriptor('removeToolName', [parameter('toolName')]),
  descriptor('deleteProfile', [parameter('name')]),
  descriptor('importPack', [parameter('packId')]),
  descriptor('copyPreset', [parameter('presetId'), parameter('newName'), parameter('display', DISPLAY_INPUT, { optional: true })]),
  descriptor('deletePreset', [parameter('presetId')]),
  descriptor('rescan')
])

// The minimal card also reads the existing host status() method over Remote.
// Its input is empty and its dynamic status object intentionally remains src-json.
export const statusDescriptor = descriptor('status')

// Mount/register the read endpoint alongside the six write descriptors.
export const clientDescriptors = Object.freeze([statusDescriptor, ...remoteDescriptors])
