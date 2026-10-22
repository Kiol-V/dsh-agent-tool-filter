// lib/templates.mjs — пакеты-шаблоны профилей фильтра (UI 0.3.0).
// По умолчанию живёт только универсальный balanced (см. lib/config.mjs); остальные
// профили пользователь получает импортом пакетов из карточки. Пакеты же показывают,
// какие профили можно создавать: любой из них можно скопировать и править под себя.
// Импорт — одна транзакция записи (см. importPack в lib/manage.mjs).
// Решение 2026-10-17: пакет universal убран, встроенный balanced в пакеты не входит —
// импорт лишь перезаписывал бы неудаляемый дефолтный профиль.

const ADMIN_TOOLS = [
  'plugin_manager',
  'security_audit',
  'test_drive',
  'drive_report',
  'create_skill',
  'subagent_fork'
]

const WEB_TOOLS = ['web_search', 'web_fetch']

// TEAM_TOOLS (spawn_teammate, wait_agent, team_task_*) убраны из шаблонов 2026-10-17:
// это own-layer имена — фильтр их не ограничивает и в UI они не выбираются, поэтому
// профили с ними обещали невозможное («no-team» не прятал team-инструменты).

export const PROFILE_PACKS = {
  gradient: {
    title: 'Градиент',
    description: 'Ступени ограничения вокруг встроенного balanced: strict и soft.',
    profiles: {
      strict: { mode: 'deny', tools: [...ADMIN_TOOLS, ...WEB_TOOLS] },
      soft: { mode: 'deny', tools: [...WEB_TOOLS] }
    }
  },
  roles: {
    title: 'По назначению',
    description: 'Ролевые профили: фокус, работа без интернета, без админ-инструментов, минимальный.',
    profiles: {
      focus: { mode: 'deny', tools: [...WEB_TOOLS, 'create_skill', 'subagent_fork'] },
      'no-web': { mode: 'deny', tools: [...WEB_TOOLS] },
      'no-admin': { mode: 'deny', tools: [...ADMIN_TOOLS] },
      minimal: { mode: 'deny', tools: [...ADMIN_TOOLS, ...WEB_TOOLS] }
    }
  },
  layers: {
    title: 'Слойные',
    description: 'Одна категория = один профиль: комбинируйте через копии.',
    profiles: {
      'no-web': { mode: 'deny', tools: [...WEB_TOOLS] },
      'no-admin': { mode: 'deny', tools: [...ADMIN_TOOLS] },
      'no-dev-skills': { mode: 'deny', tools: ['create_skill', 'subagent_fork', 'plugin_manager'] }
    }
  }
}

// Сводка пакетов для UI (без содержимого профилей — оно уходит только при импорте).
export function packSummaries () {
  return Object.entries(PROFILE_PACKS).map(([id, pack]) => ({
    id,
    title: pack.title,
    description: pack.description,
    profiles: Object.keys(pack.profiles)
  }))
}
