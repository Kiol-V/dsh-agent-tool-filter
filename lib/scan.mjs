// lib/scan.mjs — сканирование установленного DSH и сверка профилей с реальным набором tools.
// Скан — диагностика и основа для custom-профилей (UI 0.3.0): имена профилей СВЕРЯЮТСЯ с
// реальным набором, но НЕ выбрасываются — часть инструментов (deferred/own-layer) может не
// попадать в список, а итоговое скрытие решает restrict() при применении.
//
// Источник сверки — ПОЛНАЯ палитра (2026-10-17): view().knownNames/restrictableNames по
// глобальному и каждому агенту. Scoped-инструменты (plugin_manager, web_search/web_fetch,
// subagent/team) живут в пресетах и в глобальный schemas() не попадают — сверка только по
// schemas() давала ложные «не найдено» почти на всех tools.

// Полная палитра имен установленного DSH; фолбэк — schemas() (старые контексты/тесты).
// restrictable — имена, которые примет restrict(): own-layer (team_* и т.п.) входят
// в names, но не в restrictable — они существуют, но фильтром не управляются.
export function toolUniverse (ctx) {
  const known = new Set()
  const restrictable = new Set()
  let sawView = false
  try {
    const tools = ctx.get('tools')
    const collect = view => {
      if (view === null || typeof view !== 'object') return
      sawView = true
      for (const name of view.knownNames ?? []) if (name) known.add(name)
      for (const name of view.restrictableNames ?? []) {
        if (name) {
          known.add(name)
          restrictable.add(name)
        }
      }
    }
    collect(tools?.view?.())
    try {
      for (const agent of ctx.get('agents')?.list?.() ?? []) {
        try { collect(tools?.view?.(agent)) } catch { /* view этого агента недоступен */ }
      }
    } catch { /* список агентов недоступен */ }
    if (sawView) {
      return { names: [...known].sort(), restrictable: [...restrictable].sort(), available: true }
    }
  } catch { /* реестр недоступен */ }
  try {
    const schemas = ctx.get('tools')?.schemas?.()
    if (Array.isArray(schemas)) {
      const names = schemas.map(schema => schema?.name).filter(Boolean).sort()
      // Без view() restrictable неизвестен — считаем всё ограничиваемым (старое поведение).
      return { names, restrictable: names, available: true }
    }
  } catch { /* реестр недоступен — скан честно помечается */ }
  return { names: [], restrictable: [], available: false }
}

export function scanGlobalTools (ctx) {
  return toolUniverse(ctx)
}

// Сверка профилей с палитрой. Три статуса (дизайн-спека §3.6, схема ✅/⚠/❌):
//   confirmed ✅ — имя есть в restrictable (фильтр его ограничивает);
//   ownLayer  ⚠ — имя существует, но own-layer/locked: restrict() его не примёт;
//   unconfirmed ❌ — имя не найдено ни в глобальном реестре, ни у агентов
//                   (опечатка или инструмент не установлен/отключён).
// Имена НЕ выбрасываются из профиля — вердикт выносит restrict() при применении.
export function classifyProfileTools (profiles, known, restrictable) {
  const knownSet = known instanceof Set ? known : new Set(known ?? [])
  const restrictableSet = restrictable instanceof Set
    ? restrictable
    : (restrictable === undefined ? knownSet : new Set(restrictable ?? []))
  const report = {}
  const notes = []
  for (const [profileName, profile] of Object.entries(profiles)) {
    const confirmed = []
    const ownLayer = []
    const unconfirmed = []
    for (const toolName of profile.tools) {
      if (restrictableSet.has(toolName)) confirmed.push(toolName)
      else if (knownSet.has(toolName)) ownLayer.push(toolName)
      else unconfirmed.push(toolName)
    }
    report[profileName] = { confirmed, ownLayer, unconfirmed }
    for (const toolName of ownLayer) {
      notes.push(`⚠ ${toolName} (профиль "${profileName}") — own-layer: не ограничивается фильтром и не выбирается в UI`)
    }
    for (const toolName of unconfirmed) {
      notes.push(`❌ ${toolName} (профиль "${profileName}") — не найдено: проверьте имя (опечатка?) или инструмент не установлен/отключён`)
    }
  }
  const summary = Object.entries(report)
    .map(([profileName, r]) => `${profileName}: ${r.confirmed.length} подтверждено/${r.unconfirmed.length} не найдено${r.ownLayer.length > 0 ? `/${r.ownLayer.length} own-layer` : ''}`)
  return { report, summary, notes }
}
