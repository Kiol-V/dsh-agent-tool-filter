// lib/i18n.mjs — словари UI плагина (RU/EN). Все строки интерфейса живут здесь,
// не в коде (спека design-ui-spec.md §8). Фолбэк — английский; отсутствующий
// ключ в выбранном языке берётся из en, совсем неизвестный возвращается как есть.
// {param} в строках подставляется из params второго аргумента t().

export const LANGS = ['auto', 'ru', 'en']

const ru = {
  title: 'Фильтрация инструментов',
  summary: 'Настройки фильтрации инструментов',
  enabled: 'Фильтрация включена',
  enabledDesc: 'Маска применяется к корневым агентам по связкам матрицы.',
  statusLine: 'Агентов с активной маской: {agents} · скрыто схем: {hidden}',
  notLoaded: 'Статус ещё не загружен',
  refresh: 'Обновить',
  loading: 'Загрузка…',
  error: 'Ошибка: {msg}',
  statusRefreshed: 'Статус обновлён',
  statusSaved: 'Сохранено',

  langLabel: 'Язык интерфейса плагина',
  langDesc: '«Как в приложении» — активная локаль платформы; можно зафиксировать русский или английский.',
  langAuto: 'Как в приложении',
  langRu: 'Русский',
  langEn: 'English',

  matrixTitle: 'Матрица «пресет → профиль»',
  matrixIntro: 'У пресета — ровно один профиль; один профиль можно привязать к нескольким пресетам. «Копировать» создаёт custom-копию пресета, связку задаёте вторым шагом.',
  matrixEmpty: 'Пресеты не найдены.',
  blockDefault: 'Дефолтные пресеты',
  blockCustom: 'Кастомные пресеты',
  free: 'свободен',
  pickProfile: '— выберите профиль —',
  noProfile: '— без профиля —',
  bind: 'Связать',
  replace: 'Заменить',
  unbind: 'Снять',
  copyPlaceholder: 'имя копии пресета',
  copy: 'Копировать',
  delete: 'Удалить',
  bindSaved: 'Связка добавлена',
  unbindSaved: 'Связка снята',
  copySaved: 'Пресет скопирован',
  presetDeleted: 'Пресет удалён',

  profilesTitle: 'Профили',
  profilesEmpty: 'Профилей нет.',
  edit: 'Редактировать',
  newProfilePlaceholder: 'имя нового профиля',
  create: 'Создать профиль',
  profileSaved: 'Профиль сохранён',
  profileDeleted: 'Профиль удалён/сброшен',

  editorNew: 'Профиль (новый)',
  nameLabel: 'Имя:',
  modeLabel: 'Режим:',
  modeDeny: 'deny — скрывать выбранные',
  modeAllow: 'allow — оставить только выбранные',
  checkedDeny: 'Отключены (скрыты)',
  checkedAllow: 'Включены (доступны)',
  uncheckedDeny: 'Включены, но можно отключить',
  uncheckedAllow: 'Отключены, но можно включить',
  lockedTitle: 'Не управляются — всегда доступны',
  lockedSelected: ' — выбрано в профиле, но ограничитель отклонит маску — уберите имя',
  lockedFixed: ' — платформа не даёт отключить',
  save: 'Сохранить',
  saving: 'Сохранение…',
  cancel: 'Отмена',

  packsTitle: 'Пакеты-шаблоны',
  packsIntro: 'Импорт добавляет профили пакета в список; существующие с теми же именами перезаписываются.',
  import: 'Импорт',
  importSaved: 'Пакет импортирован',

  scanTitle: 'Сканирование tools',
  scanPending: 'Данные сканирования загружаются вместе со статусом.',
  scanCanDisable: '{n} tools можно отключить',
  scanCannotDisable: '{n} tools нельзя отключить',
  scanUnavailable: 'скан не выполнен: реестр tools недоступен',

  warningsTitle: 'Предупреждения',

  copyTitle: 'Копия пресета {name}',
  copyNameLabel: 'Имя копии',
  copyNameDesc: 'Описание создастся автоматически.',
  copyPreview: 'Предпросмотр описания:',
  createShort: 'Создать',
  copyProfileTitle: 'Копия профиля {name}',
  editProfileTitle: 'Профиль {name}',
  close: 'Закрыть',

  diagTitle: 'Диагностика',
  diagShow: 'Показать',
  diagHide: 'Скрыть',
  diagDesc: 'Раскрывается по клику; состояние не запоминается.',
  diagRemote: 'remote-монтирование',
  diagNamespace: 'namespace',
  diagLocale: 'locale',
  diagLang: 'язык UI',
  diagVersion: 'версия плагина'
}

const en = {
  title: 'Tool filtering',
  summary: 'Tool filtering settings',
  enabled: 'Filtering enabled',
  enabledDesc: 'The mask applies to root agents via matrix bindings.',
  statusLine: 'Agents with an active mask: {agents} · hidden schemas: {hidden}',
  notLoaded: 'Status not loaded yet',
  refresh: 'Refresh',
  loading: 'Loading…',
  error: 'Error: {msg}',
  statusRefreshed: 'Status refreshed',
  statusSaved: 'Saved',

  langLabel: 'Plugin UI language',
  langDesc: '“Same as app” follows the platform locale; you can pin Russian or English.',
  langAuto: 'Same as app',
  langRu: 'Russian',
  langEn: 'English',

  matrixTitle: 'Preset → profile matrix',
  matrixIntro: 'A preset has exactly one profile; one profile can serve several presets. “Copy” creates a custom preset copy — set its binding as a second step.',
  matrixEmpty: 'No presets found.',
  blockDefault: 'Built-in presets',
  blockCustom: 'Custom presets',
  free: 'unbound',
  pickProfile: '— select a profile —',
  noProfile: '— no profile —',
  bind: 'Bind',
  replace: 'Replace',
  unbind: 'Unbind',
  copyPlaceholder: 'preset copy name',
  copy: 'Copy',
  delete: 'Delete',
  bindSaved: 'Binding added',
  unbindSaved: 'Binding removed',
  copySaved: 'Preset copied',
  presetDeleted: 'Preset deleted',

  profilesTitle: 'Profiles',
  profilesEmpty: 'No profiles.',
  edit: 'Edit',
  newProfilePlaceholder: 'new profile name',
  create: 'Create profile',
  profileSaved: 'Profile saved',
  profileDeleted: 'Profile deleted/reset',

  editorNew: 'Profile (new)',
  nameLabel: 'Name:',
  modeLabel: 'Mode:',
  modeDeny: 'deny — hide selected',
  modeAllow: 'allow — keep only selected',
  checkedDeny: 'Disabled (hidden)',
  checkedAllow: 'Enabled (available)',
  uncheckedDeny: 'Enabled, can be disabled',
  uncheckedAllow: 'Disabled, can be enabled',
  lockedTitle: 'Not controllable — always available',
  lockedSelected: ' — selected in the profile but the limiter rejects the mask — remove the name',
  lockedFixed: ' — the platform does not allow disabling it',
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',

  packsTitle: 'Template packs',
  packsIntro: 'Import adds the pack profiles to the list; existing profiles with the same names are overwritten.',
  import: 'Import',
  importSaved: 'Pack imported',

  scanTitle: 'Tool scan',
  scanPending: 'Scan data loads together with the status.',
  scanCanDisable: '{n} tools can be disabled',
  scanCannotDisable: '{n} tools cannot be disabled',
  scanUnavailable: 'scan not performed: tool registry unavailable',

  warningsTitle: 'Warnings',

  copyTitle: 'Copy preset {name}',
  copyNameLabel: 'Copy name',
  copyNameDesc: 'The description is generated automatically.',
  copyPreview: 'Description preview:',
  createShort: 'Create',
  copyProfileTitle: 'Copy profile {name}',
  editProfileTitle: 'Profile {name}',
  close: 'Close',

  diagTitle: 'Diagnostics',
  diagShow: 'Show',
  diagHide: 'Hide',
  diagDesc: 'Expands on click; the state is not persisted.',
  diagRemote: 'remote mount',
  diagNamespace: 'namespace',
  diagLocale: 'locale',
  diagLang: 'UI language',
  diagVersion: 'plugin version'
}

const DICTS = { ru, en }

// Резолв языка: явный ru/en — как есть; 'auto'/неизвестное — по локали платформы
// (platformLang: 'ru…' → ru, иначе en); фолбэк словаря — en.
export function resolveLang (language, platformLang) {
  if (language === 'ru' || language === 'en') return language
  return typeof platformLang === 'string' && platformLang.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function makeT (lang) {
  const dict = DICTS[lang] ?? en
  return (key, params) => {
    const template = dict[key] ?? en[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
  }
}
