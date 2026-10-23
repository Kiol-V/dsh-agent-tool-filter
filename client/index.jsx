import { useCallback, useEffect, useRef, useState } from 'react'
import { makeT, resolveLang } from '../lib/i18n.mjs'
import { resolveCopyDisplay } from '../lib/preset-display.mjs'
import { clientDescriptors } from '../lib/remote-descriptors.mjs'

const PACKAGE_NAME = 'dsh-agent-tool-filter'
const SLOT_KEY = `${PACKAGE_NAME}#agent-tool-filter`

let serviceRef = undefined
// Факт успешного $mount remote-вклада — для раскрытия «Диагностика».
let remoteMounted = false
// Display-тексты пресетов — из локализационного словаря платформы (для копий).
let presetTranslate = undefined
// locale-фейс платформы: активная локаль (для режима языка «Как в приложении»).
let localeFaceRef = undefined
// Последний известный язык — для однострочного summary.
let lastLanguage = 'auto'

function messageOf (error) {
  return error instanceof Error ? error.message : String(error)
}

async function callRemote (service, method, ...args) {
  if (!service || typeof service[method] !== 'function') {
    throw new Error(`Remote-сервис agentToolFilter недоступен (вызов ${method})`)
  }
  const result = await service[method](...args)
  if (result?.ok !== true) {
    const error = result?.error
    throw new Error(error?.message ?? String(error ?? 'Remote вызов завершился ошибкой'))
  }
  const value = result.value
  if (value?.ok === false) throw new Error(value.error ?? 'Операция отклонена host-сервисом')
  return value
}

function platformLang () {
  try {
    return localeFaceRef?.getSnapshot?.().active ?? localeFaceRef?.snapshot?.active
  } catch { /* фейс без снапшота */ }
  return undefined
}

// --- Стили (design-ui-spec.md): классы atf-*, токены --dsw-alias-* платформы
// с фолбэками значений тёмной темы (для standalone-рендера и тестов). ---
const STYLE_ID = 'dsh-agent-tool-filter-styles'
const CSS = `
.atf-card { display: flex; flex-direction: column; gap: 16px; max-width: 760px; font: 400 14px/22px var(--dsw-font-family, system-ui, sans-serif); color: var(--dsw-alias-label-primary, rgb(249,250,251)); }
.atf-group { background: var(--dsw-alias-bg-layer-3, rgb(53,54,56)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-lg, 16px); padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.atf-group-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.atf-group-title { font-size: 13px; line-height: 20px; font-weight: 600; margin: 0; }
.atf-sub { font-size: 13px; line-height: 20px; font-weight: 600; margin: 8px 0 0; display: flex; align-items: center; gap: 8px; }
.atf-counter { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); background: rgba(255,255,255,0.08); border-radius: 999px; padding: 1px 8px; }
.atf-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 2px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); flex-wrap: wrap; }
.atf-row:first-of-type { border-top: none; }
.atf-row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.atf-row-label { font-size: 14px; line-height: 22px; font-weight: 500; }
.atf-row-desc { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-btn { font: 500 13px/20px var(--dsw-font-family, system-ui, sans-serif); border-radius: var(--dsw-radius-sm, 8px); cursor: pointer; border: 1px solid transparent; padding: 0 14px; height: 36px; color: var(--dsw-alias-label-primary, rgb(249,250,251)); background: none; transition: background 0.15s, border-color 0.15s, color 0.15s; }
.atf-btn.atf-sm { height: 28px; padding: 0 10px; font-size: 12px; }
.atf-btn.atf-primary { background: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); color: rgb(15,17,21); font-weight: 600; }
.atf-btn.atf-primary:hover { filter: brightness(1.08); }
.atf-btn.atf-outline { border-color: var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); }
.atf-btn.atf-outline:hover { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-btn.atf-ghost:hover { background: rgba(255,255,255,0.08); }
.atf-btn.atf-danger { border-color: rgba(242,90,90,0.5); color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
.atf-btn.atf-danger:hover { background: rgba(242,90,90,0.12); }
.atf-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.atf-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, rgb(122,170,255)); outline-offset: 2px; }
.atf-btns { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.atf-switch { width: 36px; height: 20px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); background: rgba(255,255,255,0.1); position: relative; cursor: pointer; flex: none; transition: background 0.15s, border-color 0.15s; }
.atf-switch .atf-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--dsw-alias-label-primary, rgb(249,250,251)); transition: left 0.15s; }
.atf-switch[aria-checked="true"] { background: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); border-color: var(--dsw-alias-button-primary-fill, rgb(122,170,255)); }
.atf-switch[aria-checked="true"] .atf-thumb { left: 18px; background: rgb(15,17,21); }
.atf-switch:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, rgb(122,170,255)); outline-offset: 2px; }
.atf-switch.atf-mini { width: 30px; height: 16px; }
.atf-switch.atf-mini .atf-thumb { width: 10px; height: 10px; }
.atf-switch.atf-mini[aria-checked="true"] .atf-thumb { left: 16px; }
@media (prefers-reduced-motion: reduce) { .atf-card * { transition: none !important; } }
.atf-pill-wrap { position: relative; display: inline-flex; }
.atf-pill { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); cursor: pointer; font-size: 13px; line-height: 20px; background: rgba(255,255,255,0.04); color: var(--dsw-alias-label-primary, rgb(249,250,251)); }
.atf-pill:hover { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-pill.atf-pill-sm { height: 28px; border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; padding: 0 10px; }
.atf-pill.atf-placeholder { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-chevron { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); font-size: 10px; }
.atf-pill-menu { position: absolute; top: calc(100% + 4px); left: 0; min-width: 100%; margin: 0; padding: 4px; list-style: none; background: var(--dsw-alias-bg-layer-3, rgb(53,54,56)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-sm, 8px); z-index: 50; max-height: 240px; overflow: auto; }
.atf-pill-item { padding: 6px 10px; border-radius: var(--dsw-radius-xs, 4px); cursor: pointer; font-size: 13px; white-space: nowrap; }
.atf-pill-item:hover { background: rgba(255,255,255,0.08); }
.atf-pill-item[aria-selected="true"] { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-input { height: 36px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-sm, 8px); background: rgba(255,255,255,0.04); color: var(--dsw-alias-label-primary, rgb(249,250,251)); font: 400 13px/20px var(--dsw-font-family, system-ui, sans-serif); padding: 0 10px; }
.atf-input.atf-text { width: 200px; }
.atf-input.atf-num { width: 76px; text-align: right; }
.atf-input.atf-sm { height: 28px; font-size: 12px; }
.atf-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.atf-item { min-height: 106px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); padding: 12px; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.03); }
.atf-item.atf-active { border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); background: rgba(122,170,255,0.14); }
.atf-item-head { display: flex; align-items: center; gap: 8px; }
.atf-icon-chip { width: 28px; height: 28px; border-radius: var(--dsw-radius-sm, 8px); flex: none; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.atf-item-title { font-size: 13px; line-height: 20px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.atf-item-desc { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.atf-item-foot { margin: auto -12px -12px; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); display: flex; gap: 12px; border-radius: 0 0 var(--dsw-radius-md, 12px) var(--dsw-radius-md, 12px); }
.atf-link { background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.atf-link:hover { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-mrow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px 2px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 13px; }
.atf-mrow:first-of-type { border-top: none; }
.atf-code { font: 400 12px/18px var(--ds-font-family-code, ui-monospace, Consolas, monospace); background: rgba(255,255,255,0.08); border-radius: var(--dsw-radius-xs, 4px); padding: 1px 6px; }
.atf-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; line-height: 16px; border-radius: 999px; padding: 1px 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-tag.atf-accent { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); border-color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-tag.atf-success { color: var(--dsw-alias-state-success-primary, rgb(34,197,94)); border-color: rgba(34,197,94,0.5); }
.atf-tag.atf-warning { color: var(--dsw-static-amber-400, rgb(247,173,49)); border-color: rgba(247,173,49,0.5); }
.atf-tag.atf-danger { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); border-color: rgba(242,90,90,0.5); }
.atf-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.atf-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px 0 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-xs, 4px); font-size: 12px; }
.atf-chip button { border: none; background: none; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 4px; border-radius: var(--dsw-radius-xs, 4px); }
.atf-chip button:hover { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); background: rgba(242,90,90,0.12); }
.atf-check { display: flex; align-items: center; gap: 8px; padding: 6px 2px; font-size: 13px; line-height: 20px; }
.atf-check .atf-locked { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-report { font: 400 12px/18px var(--ds-font-family-code, ui-monospace, Consolas, monospace); background: rgba(255,255,255,0.04); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); padding: 12px; display: flex; flex-direction: column; gap: 4px; white-space: pre-wrap; }
.atf-muted { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-alert { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border: 1px solid rgba(242,90,90,0.5); background: rgba(242,90,90,0.1); border-radius: var(--dsw-radius-sm, 8px); font-size: 12px; line-height: 18px; }
.atf-status { font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-success-primary, rgb(34,197,94)); }
.atf-statusbar { min-height: 20px; display: flex; align-items: center; }
.atf-status.atf-loading { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-status.atf-error { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
.atf-empty { padding: 16px; text-align: center; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); font-size: 12px; line-height: 18px; border: 1px dashed var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-md, 12px); }
.atf-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.atf-modal { background: var(--dsw-alias-bg-base, rgb(21,21,23)); color: var(--dsw-alias-label-primary, rgb(249,250,251)); border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-lg, 16px); width: min(460px, 92vw); max-height: 80vh; overflow: auto; display: flex; flex-direction: column; }
.atf-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); font-size: 14px; line-height: 22px; }
.atf-modal-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.atf-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); }
.atf-link.atf-link-danger { color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); }
`

function ensureStyles () {
  try {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  } catch { /* без DOM (тесты) стили не нужны */ }
}

// --- Базовые элементы (design-ui-spec.md §4). ---

// Статус действий (design-ui-spec.md §4.8): показывается ПОД блоком, где было
// действие (section), последнее действие заменяет предыдущее и гаснет само
// (успех — 4 с, ошибка — 12 с). Накопления статусов нет, макет не «дышит».
function StatusBar ({ flash, section }) {
  return (
    <div className="atf-statusbar">
      {flash === null || flash.section !== section
        ? null
        : flash.kind === 'error'
          ? <span className="atf-status atf-error" role="alert">{flash.text}</span>
          : <span className={`atf-status${flash.kind === 'loading' ? ' atf-loading' : ''}`} role="status">{flash.text}</span>}
    </div>
  )
}

function Switch ({ checked, onChange, label, mini, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`atf-switch${mini ? ' atf-mini' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="atf-thumb" />
    </button>
  )
}

function PillSelect ({ value, options, onChange, disabled, small, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = event => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const current = options.find(option => option.value === value)
  return (
    <span className="atf-pill-wrap" ref={ref}>
      <button
        type="button"
        className={`atf-pill${small ? ' atf-pill-sm' : ''}${current === undefined ? ' atf-placeholder' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(previous => !previous)}
      >
        {current?.label ?? placeholder} <span className="atf-chevron">▼</span>
      </button>
      {open && (
        <ul className="atf-pill-menu" role="listbox">
          {options.map(option => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className="atf-pill-item"
              onClick={() => { onChange(option.value); setOpen(false) }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

// --- Модальное окно (design-ui-spec.md §4.10): role=dialog, Esc, клик по бэкдропу
// закрывают (несохранённые правки отбрасываются), фиксированный футер действий. ---
function Modal ({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="atf-overlay" role="presentation" onClick={onClose}>
      <div
        className="atf-modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={event => event.stopPropagation()}
      >
        <div className="atf-modal-head">
          <strong>{title}</strong>
          <button type="button" className="atf-btn atf-ghost atf-sm" onClick={onClose}>×</button>
        </div>
        <div className="atf-modal-body">{children}</div>
        {footer && <div className="atf-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// --- Модалка копии пресета: имя + предпросмотр создаваемого описания (§4.10). ---
export function PresetCopyModal ({ preset, info, t, onCancel, onConfirm }) {
  const [name, setName] = useState('')
  const display = resolveCopyDisplay(presetTranslate, preset, info)
  const title = display?.name ?? info?.name ?? preset
  return (
    <Modal
      title={t('copyTitle', { name: title })}
      onClose={onCancel}
      footer={(
        <>
          <button type="button" className="atf-btn atf-primary" disabled={name.trim() === ''} onClick={() => onConfirm(name.trim())}>
            {t('createShort')}
          </button>
          <button type="button" className="atf-btn atf-ghost" onClick={onCancel}>{t('cancel')}</button>
        </>
      )}
    >
      <div className="atf-row" style={{ borderTop: 'none' }}>
        <div className="atf-row-text">
          <span className="atf-row-label">{t('copyNameLabel')}</span>
          <span className="atf-row-desc">{t('copyNameDesc')}</span>
        </div>
        <input className="atf-input atf-text" type="text" value={name} aria-label={t('copyNameLabel')} onChange={event => setName(event.target.value)} autoFocus />
      </div>
      <div className="atf-row-desc">{t('copyPreview')}</div>
      <div className="atf-report">{t('copyTitle', { name: title })}{display?.description ? `\n${display.description}` : ''}</div>
    </Modal>
  )
}

// --- Матрица «пресет → профиль»: два блока (дефолтные → кастомные, по алфавиту);
// пресеты — карточками (design-ui-spec.md §3.4): заголовок с тегом связки, связка в
// теле, полоса действий «Копировать» (модалка) · «Удалить». ---
export function PresetRow ({ preset, bound, info, profileNames, busy, t, onBind, onUnbind, onCopyRequest, onDeletePreset }) {
  const [profileName, setProfileName] = useState(bound ?? '')
  return (
    <div className={`atf-item${bound !== undefined ? ' atf-active' : ''}`}>
      <div className="atf-item-head">
        <code className="atf-code">{preset}</code>
        {bound === undefined
          ? <span className="atf-tag">{t('free')}</span>
          : <span className="atf-tag atf-accent">→ {bound}</span>}
      </div>
      <div className="atf-btns">
        <PillSelect
          small
          value={profileName === '' ? undefined : profileName}
          placeholder={bound === undefined ? t('pickProfile') : t('noProfile')}
          options={profileNames.map(name => ({ value: name, label: name }))}
          onChange={setProfileName}
          disabled={busy || profileNames.length === 0}
        />
        <button type="button" className="atf-btn atf-primary atf-sm" disabled={busy || profileName === ''} onClick={() => onBind(preset, profileName)}>
          {bound === undefined ? t('bind') : t('replace')}
        </button>
        {bound !== undefined && (
          <button type="button" className="atf-btn atf-ghost atf-sm" disabled={busy} onClick={() => onUnbind(preset)}>
            {t('unbind')}
          </button>
        )}
      </div>
      <div className="atf-item-foot">
        <button type="button" className="atf-link" disabled={busy} onClick={() => onCopyRequest(preset)}>{t('copy')}</button>
        {info?.deletable === true && (
          <button type="button" className="atf-link atf-link-danger" disabled={busy} onClick={() => onDeletePreset(preset)}>{t('delete')}</button>
        )}
      </div>
    </div>
  )
}

export function MatrixSection ({ status, busy, t = makeT('en'), onBind, onUnbind, onCopyPreset, onDeletePreset }) {
  const matrix = status?.presets ?? {}
  const profileNames = Object.keys(status?.profiles ?? {})
  const allPresets = [...new Set([...(status?.presetIds ?? []), ...Object.keys(matrix)])]
  const [copyFor, setCopyFor] = useState(null)
  const byAlphabet = (a, b) => a.localeCompare(b, 'ru')
  const isCustom = preset => status?.presetInfo?.[preset]?.deletable === true
  const defaultPresets = allPresets.filter(preset => !isCustom(preset)).sort(byAlphabet)
  const customPresets = allPresets.filter(isCustom).sort(byAlphabet)
  const renderRow = preset => (
    <PresetRow
      key={preset}
      preset={preset}
      bound={matrix[preset]}
      info={status?.presetInfo?.[preset]}
      profileNames={profileNames}
      busy={busy}
      t={t}
      onBind={onBind}
      onUnbind={onUnbind}
      onCopyRequest={setCopyFor}
      onDeletePreset={onDeletePreset}
    />
  )
  const renderBlock = (title, list) => list.length === 0
    ? null
    : (
      <section className="atf-group" aria-label={title}>
        <div className="atf-group-head">
          <h4 className="atf-group-title">{title}</h4>
          <span className="atf-counter">{list.length}</span>
        </div>
        <div className="atf-grid">
          {list.map(renderRow)}
        </div>
      </section>
    )
  return (
    <div className="atf-card" aria-label={t('matrixTitle')}>
      <h3 className="atf-group-title">{t('matrixTitle')}</h3>
      <p className="atf-row-desc">{t('matrixIntro')}</p>
      {allPresets.length === 0
        ? <div className="atf-empty">{t('matrixEmpty')}</div>
        : (
          <>
            {renderBlock(t('blockDefault'), defaultPresets)}
            {renderBlock(t('blockCustom'), customPresets)}
          </>
        )}
      {copyFor !== null && (
        <PresetCopyModal
          preset={copyFor}
          info={status?.presetInfo?.[copyFor]}
          t={t}
          onCancel={() => setCopyFor(null)}
          onConfirm={name => {
            onCopyPreset(copyFor, name)
            setCopyFor(null)
          }}
        />
      )}
    </div>
  )
}

// --- Редактор профиля: select-пилюля режима + три группы чекбоксов (§4.6). ---
export function ProfileEditor ({ name, profile, controllableTools, lockedTools, busy, isNew = false, kind, t = makeT('en'), onSave, onCancel }) {
  const [nameValue, setNameValue] = useState(name)
  const [mode, setMode] = useState(profile.mode)
  const [selected, setSelected] = useState(() => new Set(profile.tools))
  const controllable = new Set(controllableTools ?? [])
  const locked = new Set(lockedTools ?? [])
  // Всё выбранное в профиле показывается с чекбоксом, включая проблемные имена
  // (опечатки, удалённые плагины, «платформа не даёт отключить»): снятие отметки +
  // сохранение убирает имя из профиля, и при следующем открытии строки уже нет.
  const [order] = useState(() => [...new Set([
    ...controllable,
    ...profile.tools
  ])].sort())
  // Справочный блок — только платформенные имена, НЕ выбранные в профиле.
  const [lockedList] = useState(() => [...locked].filter(tool => !profile.tools.includes(tool)).sort())
  const checkedList = order.filter(tool => selected.has(tool))
  const uncheckedList = order.filter(tool => !selected.has(tool))
  const toggle = tool => setSelected(previous => {
    const next = new Set(previous)
    if (next.has(tool)) next.delete(tool)
    else next.add(tool)
    return next
  })
  const toolRow = tool => (
    <label key={tool} className="atf-check">
      <input type="checkbox" checked={selected.has(tool)} onChange={() => toggle(tool)} />{' '}
      <code className="atf-code">{tool}</code>
      {!controllable.has(tool) && (
        <span className="atf-locked">
          {locked.has(tool)
            ? (selected.has(tool) ? t('lockedSelected') : t('lockedFixed'))
            : t('unknownSelected')}
        </span>
      )}
    </label>
  )
  const editKind = kind ?? (isNew ? 'create' : 'edit')
  const nameEditable = editKind !== 'edit' || isNew
  const title = editKind === 'create'
    ? t('editorNew')
    : editKind === 'copy'
      ? t('copyProfileTitle', { name })
      : t('editProfileTitle', { name })
  return (
    <Modal title={title} onClose={onCancel} footer={(
      <>
        <button type="button" className="atf-btn atf-primary" disabled={busy || (nameEditable && nameValue.trim() === '')} onClick={() => onSave(nameEditable ? nameValue.trim() : name, { mode, tools: [...selected] })}>
          {busy ? t('saving') : t('save')}
        </button>
        <button type="button" className="atf-btn atf-ghost" disabled={busy} onClick={onCancel}>{t('cancel')}</button>
      </>
    )}>
      {nameEditable && (
        <div className="atf-row">
          <div className="atf-row-text"><span className="atf-row-label">{t('nameLabel')}</span></div>
          <input className="atf-input atf-text" type="text" value={nameValue} aria-label={t('nameLabel')} onChange={event => setNameValue(event.target.value)} />
        </div>
      )}
      <div className="atf-row">
        <div className="atf-row-text"><span className="atf-row-label">{t('modeLabel')}</span></div>
        <PillSelect
          value={mode}
          options={[{ value: 'deny', label: t('modeDeny') }, { value: 'allow', label: t('modeAllow') }]}
          onChange={setMode}
          disabled={busy}
        />
      </div>
      <h5 className="atf-sub">{mode === 'deny' ? t('checkedDeny') : t('checkedAllow')} — {checkedList.length}</h5>
      <div>{checkedList.map(toolRow)}</div>
      <h5 className="atf-sub">{mode === 'deny' ? t('uncheckedDeny') : t('uncheckedAllow')} — {uncheckedList.length}</h5>
      <div>{uncheckedList.map(toolRow)}</div>
      {lockedList.length > 0 && (
        <>
          <h5 className="atf-sub">{t('lockedTitle')}</h5>
          <div>
            {lockedList.map(tool => (
              <div key={tool} className="atf-check">
                <code className="atf-code">{tool}</code>
                <span className="atf-locked">{t('lockedFixed')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

// --- Профили: карточки-элементы с полосой действий (§3.2). ---
export function ProfilesSection ({ status, busy, editing, t = makeT('en'), onEdit, onCopy, onCancel, onSave, onDelete }) {
  const profiles = status?.profiles ?? {}
  const names = Object.keys(profiles)
  const groups = status?.report?.groups
  const controllableTools = groups?.controllable ?? status?.tools ?? []
  const lockedTools = groups?.locked ?? status?.lockedTools ?? []
  const [newName, setNewName] = useState('')
  return (
    <section className="atf-group" aria-label={t('profilesTitle')}>
      <div className="atf-group-head">
        <h4 className="atf-group-title">{t('profilesTitle')}</h4>
        <span className="atf-counter">{names.length}</span>
      </div>
      {names.length === 0
        ? <div className="atf-empty">{t('profilesEmpty')}</div>
        : (
          <div className="atf-grid">
            {names.map(name => (
              <div key={name} className={`atf-item${editing?.name === name ? ' atf-active' : ''}`}>
                <div className="atf-item-head">
                  <span className="atf-icon-chip">{name.slice(0, 1).toUpperCase()}</span>
                  <span className="atf-item-title">{name}</span>
                </div>
                <div className="atf-item-desc">{profiles[name].mode} · tools: {profiles[name].tools.length}</div>
                <div className="atf-item-foot">
                  <button type="button" className="atf-link" disabled={busy || editing !== null} onClick={() => onEdit(name, profiles[name])}>{t('edit')}</button>
                  <button type="button" className="atf-link" disabled={busy || editing !== null} onClick={() => onCopy(name)}>{t('copy')}</button>
                  <button type="button" className="atf-link" disabled={busy || editing !== null} onClick={() => onDelete(name)}>{t('delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      <div className="atf-btns">
        <input
          className="atf-input atf-text"
          type="text"
          value={newName}
          placeholder={t('newProfilePlaceholder')}
          aria-label={t('newProfilePlaceholder')}
          onChange={event => setNewName(event.target.value)}
          disabled={busy || editing !== null}
        />
        <button type="button" className="atf-btn atf-outline" disabled={busy || editing !== null || newName.trim() === ''} onClick={() => onEdit(newName.trim(), null)}>
          {t('create')}
        </button>
      </div>
      {editing !== null && (
        <ProfileEditor
          key={editing.name}
          name={editing.name}
          profile={editing.profile ?? { mode: 'deny', tools: [] }}
          isNew={profiles[editing.name] === undefined}
          kind={editing.kind ?? (editing.profile === null ? 'create' : 'edit')}
          controllableTools={controllableTools}
          lockedTools={lockedTools}
          busy={busy}
          t={t}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </section>
  )
}

// --- Пакеты-шаблоны: карточки-элементы с полосой действия «Импорт» (§3.2). ---
export function PacksSection ({ packs, busy, t = makeT('en'), onImport }) {
  if (!Array.isArray(packs) || packs.length === 0) return null
  return (
    <section className="atf-group" aria-label={t('packsTitle')}>
      <div className="atf-group-head">
        <h4 className="atf-group-title">{t('packsTitle')}</h4>
        <span className="atf-counter">{packs.length}</span>
      </div>
      <p className="atf-row-desc">{t('packsIntro')}</p>
      <div className="atf-grid">
        {packs.map(pack => (
          <div key={pack.id} className="atf-item">
            <div className="atf-item-head">
              <span className="atf-icon-chip">↓</span>
              <span className="atf-item-title">{pack.title}</span>
            </div>
            <div className="atf-item-desc">{pack.description} (<code className="atf-code">{pack.profiles.join(', ')}</code>)</div>
            <div className="atf-item-foot">
              <button type="button" className="atf-link" disabled={busy} onClick={() => onImport(pack.id)}>{t('import')}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// --- Сканирование tools: сводка по ПАЛИТРЕ DSH (не по профилям) — две группы
// ✅ можно отключить / ⚠ нельзя отключить (§3.6). Список «нельзя отключить» —
// в блоке «Предупреждения»; привязка к профилям бессмысленна: если tool можно
// отключить, его можно отключить в любом профиле. ---
export function ScanSection ({ report, t = makeT('en') }) {
  const controllable = report?.groups?.controllable ?? []
  const locked = report?.groups?.locked ?? []
  return (
    <section className="atf-group" aria-label={t('scanTitle')}>
      <div className="atf-group-head"><h4 className="atf-group-title">{t('scanTitle')}</h4></div>
      {report == null
        ? <div className="atf-empty">{t('scanPending')}</div>
        : report.available === false
          ? <div className="atf-empty">{t('scanUnavailable')}</div>
          : (
            <div className="atf-report">
              <div>✅ {t('scanCanDisable', { n: controllable.length })}</div>
              <div>⚠ {t('scanCannotDisable', { n: locked.length })}</div>
            </div>
          )}
    </section>
  )
}

// --- Предупреждения: ❌-варны («не найдено») несут кнопку «Убрать имя из
// профиля» — быстрый фикс опечатки/удалённого плагина без редактора профиля. ---
export function WarningsSection ({ items, busy, t = makeT('en'), onRemoveName }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <section className="atf-group" aria-label={t('warningsTitle')}>
      <div className="atf-group-head">
        <h4 className="atf-group-title">{t('warningsTitle')}</h4>
        <span className="atf-counter">{items.length}</span>
      </div>
      {items.map(item => (
        <div key={item.text} className="atf-alert" role="alert">
          <span>{item.text}</span>
          {item.type === 'unknown' && (
            <button type="button" className="atf-btn atf-outline atf-sm" disabled={busy} onClick={() => onRemoveName(item.tool)}>
              {t('removeName')}
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

function AgentToolFilterCard ({ service }) {
  const [status, setStatus] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showDiag, setShowDiag] = useState(false)
  // Единый статус-бар: { kind: 'loading'|'saved'|'error', text } — последнее
  // действие заменяет предыдущее (никакого накопления статусов).
  const [flash, setFlash] = useState(null)
  const [busy, setBusy] = useState(false)
  const flashTimer = useRef(null)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const runAction = async (action, savedText, section, onSuccess) => {
    clearTimeout(flashTimer.current)
    setBusy(true)
    setFlash({ kind: 'loading', text: t('loading'), section })
    try {
      const value = await action()
      onSuccess?.(value)
      setBusy(false)
      setFlash({ kind: 'saved', text: savedText, section })
      flashTimer.current = setTimeout(() => setFlash(null), 4000)
      return value
    } catch (error) {
      setBusy(false)
      setFlash({ kind: 'error', text: messageOf(error), section })
      flashTimer.current = setTimeout(() => setFlash(null), 12000)
      return undefined
    }
  }

  const applyStatus = value => {
    if (value?.status) setStatus(value.status)
  }

  // Язык UI: явный ru/en из конфига, иначе активная локаль платформы (§8 спеки).
  const langSetting = status?.language ?? 'auto'
  lastLanguage = langSetting
  const t = makeT(resolveLang(langSetting, platformLang()))

  const refresh = () => runAction(
    () => callRemote(service, 'status'),
    t('statusRefreshed'), 'header', setStatus
  )

  useEffect(() => { void refresh() }, []) // инициализация при маунте

  const setEnabled = next => runAction(
    () => callRemote(service, 'setEnabled', next),
    t('statusSaved'), 'header', applyStatus
  )

  const setDebugLog = next => runAction(
    () => callRemote(service, 'setDebugLog', next),
    t('statusSaved'), 'header', applyStatus
  )

  const changeLanguage = language => runAction(
    () => callRemote(service, 'setLanguage', language),
    t('statusSaved'), 'header', applyStatus
  )

  const bind = (presetId, profileName) => runAction(
    () => callRemote(service, 'bindPreset', presetId, profileName),
    t('bindSaved'), 'matrix', applyStatus
  )

  const unbind = presetId => runAction(
    () => callRemote(service, 'unbindPreset', presetId),
    t('unbindSaved'), 'matrix', applyStatus
  )

  const saveProfile = (name, profile) => runAction(
    () => callRemote(service, 'setProfile', name, profile),
    t('profileSaved'), 'profiles',
    value => {
      applyStatus(value)
      setEditing(null)
    }
  )

  const deleteProfile = name => runAction(
    () => callRemote(service, 'deleteProfile', name),
    t('profileDeleted'), 'profiles',
    value => {
      applyStatus(value)
      setEditing(null)
    }
  )

  const removeToolName = toolName => runAction(
    () => callRemote(service, 'removeToolName', toolName),
    t('removeNameDone'), 'warnings', applyStatus
  )

  // editing = { name, profile | null, kind: 'create' | 'edit' | 'copy' }: модалка
  // редактора открывается в нужном режиме (create/copy показывают поле имени).
  const editProfile = (name, profile) => {
    setEditing({ name, profile, kind: profile === null ? 'create' : 'edit' })
  }

  const copyProfile = name => {
    const source = status?.profiles?.[name]
    setEditing({
      name: `${name}-copy`,
      profile: source ? { mode: source.mode, tools: [...source.tools] } : null,
      kind: 'copy'
    })
  }

  const importProfilePack = packId => runAction(
    () => callRemote(service, 'importPack', packId),
    t('importSaved'), 'packs', applyStatus
  )

  const copyPresetCall = (presetId, newName) => {
    // Display-тексты источника: шиповые — из словаря DSH, кастомные — их
    // опубликованные метаданные из presetInfo (resolveCopyDisplay); host дополнительно
    // фолбэчит roster/строку конфига.
    const display = resolveCopyDisplay(presetTranslate, presetId, status?.presetInfo?.[presetId])
    return runAction(
      () => callRemote(service, 'copyPreset', presetId, newName, display),
      t('copySaved'), 'matrix', applyStatus
    )
  }

  const deletePresetCall = presetId => runAction(
    () => callRemote(service, 'deletePreset', presetId),
    t('presetDeleted'), 'matrix', applyStatus
  )

  const agents = Array.isArray(status?.agents) ? status.agents : []
  const hiddenSchemas = agents.reduce((total, agent) => total + (Number(agent?.hidden) || 0), 0)
  const warnings = Array.isArray(status?.warnings) ? status.warnings : []
  const warningItems = Array.isArray(status?.warningItems)
    ? status.warningItems
    : warnings.map(text => ({ type: 'plain', text }))

  return (
    <div className="atf-card">
      <section className="atf-group" aria-label={t('title')}>
        <div className="atf-group-head">
          <h4 className="atf-group-title">{t('title')}</h4>
          <div className="atf-btns">
            <button type="button" className="atf-btn atf-outline atf-sm" disabled={busy} onClick={() => { void refresh() }}>
              {t('refresh')}
            </button>
          </div>
        </div>
        <StatusBar flash={flash} section="header" />
        <div className="atf-row">
          <div className="atf-row-text">
            <span className="atf-row-label">{t('enabled')}</span>
            <span className="atf-row-desc">{t('enabledDesc')}</span>
          </div>
          <Switch
            checked={status?.enabled === true}
            onChange={setEnabled}
            label={t('enabled')}
            disabled={status === null || busy}
          />
        </div>
        <div className="atf-row">
          <div className="atf-row-text">
            <span className="atf-row-label">{t('debugLog')}</span>
            <span className="atf-row-desc">{t('debugLogDesc')}</span>
          </div>
          <Switch
            checked={status?.debugLog === true}
            onChange={setDebugLog}
            label={t('debugLog')}
            disabled={status === null || busy}
          />
        </div>
        <div className="atf-row">
          <div className="atf-row-text">
            <span className="atf-row-label">
              {status === null ? t('notLoaded') : t('statusLine', { agents: agents.length, hidden: hiddenSchemas })}
            </span>
          </div>
        </div>
        <div className="atf-row">
          <div className="atf-row-text">
            <span className="atf-row-label">{t('langLabel')}</span>
            <span className="atf-row-desc">{t('langDesc')}</span>
          </div>
          <div className="atf-btns">
            <PillSelect
              value={langSetting}
              options={[
                { value: 'auto', label: t('langAuto') },
                { value: 'ru', label: t('langRu') },
                { value: 'en', label: t('langEn') }
              ]}
              onChange={changeLanguage}
              disabled={busy}
            />
          </div>
        </div>
      </section>

      <MatrixSection status={status} busy={busy} t={t} onBind={bind} onUnbind={unbind} onCopyPreset={copyPresetCall} onDeletePreset={deletePresetCall} />
      <StatusBar flash={flash} section="matrix" />

      <ProfilesSection status={status} busy={busy} editing={editing} t={t} onEdit={editProfile} onCopy={copyProfile} onCancel={() => setEditing(null)} onSave={saveProfile} onDelete={deleteProfile} />
      <StatusBar flash={flash} section="profiles" />

      <PacksSection packs={status?.packs ?? []} busy={busy} t={t} onImport={importProfilePack} />
      <StatusBar flash={flash} section="packs" />

      <ScanSection report={status?.report ?? null} t={t} />

      <WarningsSection items={warningItems} busy={busy} t={t} onRemoveName={removeToolName} />

      <section className="atf-group" aria-label={t('diagTitle')}>
        <div className="atf-group-head">
          <h4 className="atf-group-title">{t('diagTitle')}</h4>
          <button type="button" className="atf-btn atf-outline atf-sm" onClick={() => setShowDiag(previous => !previous)}>
            {showDiag ? t('diagHide') : t('diagShow')}
          </button>
        </div>
        <p className="atf-row-desc">{t('diagDesc')}</p>
        {showDiag && (
          <div className="atf-report">
            <div>{t('diagRemote')}: {remoteMounted ? 'mounted' : 'not mounted'}</div>
            <div>{t('diagNamespace')}: {serviceRef ? 'ok' : 'missing'}</div>
            <div>{t('diagLocale')}: {presetTranslate ? 'ok' : 'missing'}</div>
            <div>{t('diagLang')}: {langSetting} → {resolveLang(langSetting, platformLang())}</div>
            <div>{t('diagVersion')}: {status?.version ?? '—'}</div>
            <div>{t('diagLogPath')}: <code className="atf-code">{status?.debugLogPath ?? '—'}</code></div>
            <div>presets: {status?.presetIds?.length ?? 0} · profiles: {Object.keys(status?.profiles ?? {}).length} · tools: {status?.report?.names?.length ?? 0}</div>
          </div>
        )}
      </section>
    </div>
  )
}

function RowConfig ({ view }) {
  const t = makeT(resolveLang(lastLanguage, platformLang()))
  if (view === 'summary') return <span>{t('summary')}</span>
  return <AgentToolFilterCard service={serviceRef} />
}

// Неубиваемая обёртка: ошибка рендера карточки не должна ронять слот
// (слот выбывает из рендера навсегда после первой ошибки — abdicate),
// поэтому показываем её прямо на странице и пишем в консоль.
function SafeRowConfig (props) {
  try {
    return <RowConfig {...props} />
  } catch (error) {
    console.error('dsh-agent-tool-filter: card render failed:', error)
    return <span role="alert">Ошибка рендера карточки: {messageOf(error)}</span>
  }
}

export const inject = ['remote', 'slots']

export function apply (ctx) {
  // Синхронный apply: fiber выходит из LOADING за микро-такты, как у рабочих
  // entry (searxng/usage-chart). $mount — локальная регистрация, не блокируем ей boot.
  ensureStyles()
  let disposeRemote
  let cancelled = false
  ctx.remote.$mount({
    package: PACKAGE_NAME,
    descriptors: clientDescriptors
  }).then(dispose => {
    disposeRemote = dispose
    remoteMounted = true
    if (cancelled) return void dispose()
    // Доступ к namespace — только с объявлением в inject (паттерн voice-input).
    try {
      ctx.inject(['remote.agentToolFilter'], nsCtx => {
        let ns
        try {
          ns = nsCtx.remote?.agentToolFilter
        } catch (error) {
          console.error('dsh-agent-tool-filter: nsCtx.remote read failed:', error)
        }
        if (!ns) {
          try {
            ns = nsCtx.get?.('remote.agentToolFilter')
          } catch (error) {
            console.error('dsh-agent-tool-filter: nsCtx.get read failed:', error)
          }
        }
        serviceRef = ns
        console.info('dsh-agent-tool-filter: namespace captured:', ns ? 'ok' : 'missing')
        return () => {
          serviceRef = undefined
        }
      })
    } catch (error) {
      console.error('dsh-agent-tool-filter: ctx.inject failed:', error)
    }
  }, error => {
    console.error('dsh-agent-tool-filter: Remote contribution failed:', error)
  })
  // locale-фейс платформы: активная локаль (режим «Как в приложении») и
  // display-тексты пресетов для копий.
  try {
    ctx.inject(['locale'], localeCtx => {
      let face
      try {
        face = localeCtx.locale ?? (typeof localeCtx.get === 'function' ? localeCtx.get('locale') : undefined)
      } catch (error) {
        console.error('dsh-agent-tool-filter: locale read failed:', error)
      }
      localeFaceRef = face
      presetTranslate = typeof face?.bind === 'function' ? face.bind('settings.agentPreset') : undefined
      console.info('dsh-agent-tool-filter: locale captured:', face ? 'ok' : 'missing')
      return () => {
        localeFaceRef = undefined
        presetTranslate = undefined
      }
    })
  } catch (error) {
    console.error('dsh-agent-tool-filter: locale inject failed:', error)
  }
  ctx.effect(() => () => {
    cancelled = true
    void disposeRemote?.()
  }, 'dsh-agent-tool-filter: Remote contribution')

  ctx.slots.inject('plugins.row.config', () => {
    return ctx.slots.register({
      name: 'plugins.row.config',
      key: SLOT_KEY
    }, ({ view }) => <SafeRowConfig view={view} />)
  })
}
