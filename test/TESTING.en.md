# Testing dsh-agent-tool-filter — report

Русская версия: см. [TESTING.md](<TESTING.md>).

- **Release:** current (see [GitHub Releases](https://github.com/Kiol-V/dsh-agent-tool-filter/releases))
- **Date:** 2026-10-26
- **Environment:** DSH 0.2.1-rc.2, Windows 11 (10.0.22000); DSH test profile and an isolated `test_drive` run

## 1. Tooling

### Automated tests (part of the repository, `test/` directory)

Canonical run: `node --test test/` from the `repo/` directory. Each module is also self-contained: `node test/<module>.test.mjs`.

| Module | What it checks |
|---|---|
| `config.test.mjs` | config normalization: defaults, matrix, profiles, `language` and `debugLog` fields, rejection of invalid values |
| `restriction.test.mjs` | masking mechanics: name-by-name `restrict()`, allow with filtering of unknown names, mask removal, hidden counters |
| `agent-filter.test.mjs` | filter application: root agents only, hot-update, intermediate states (the mask is not lost), deferred retries |
| `compat-mode.test.mjs` | auto/hide/block modes, tool-usage detection (including text-based), guard |
| `serializer.test.mjs` | YAML dialect of profile bundle entries, golden form, `!!js` escaping |
| `manage.test.mjs` | write API: mappings, profiles, `removeToolName`, preset copies/deletion, packs, `setLanguage`, `setDebugLog` |
| `diagnostics.test.mjs` | status (including `debugLogPath`), name validation, ✅/⚠/❌ warnings |
| `scan.test.mjs` | DSH palette scanning, tool classification (can / cannot be disabled) |
| `remote-api.test.mjs` | Typert Remote registration (404 regression), service contract |
| `remote-descriptors.test.mjs` | call descriptors, strict codecs, optional parameters |
| `i18n.test.mjs` | RU/EN dictionaries, language resolution, `language` validation |
| `preset-display.test.mjs` | preset display texts: the DSH dictionary, published metadata, fallbacks |
| `client-render.test.mjs` | UI card rendering: sections, modals, warnings with the «Remove name» button, localization (SSR smoke) |
| `debug-fallback.test.mjs` | file diagnostics: `ATF_DEBUG_LOG` env override, `<DSH_HOME>/logs/` default, `resolveLogPath` |
| `preset-reapply.test.mjs` | re-applying the mask on preset change |
| `display-assets.test.mjs` | display assets (icon, locales) |
| `approval-bridge.test.mjs` | approval bridge semantics: allow-once, rejection, fail-closed, cancellation, binding arguments to the session |
| `approval-store.test.mjs` | client-side store of approval requests |
| `approval-panel-render.test.mjs` | approval panel rendering: queue, placeholders, filtering of Unicode control characters, text limits |

### Additional tooling

- `test/verify-yaml.mjs` — syntax validation of the profile `cordis.patch.yml` with the YAML parser from DSH.
- `scripts/build.mjs` — client bundle build; the tarball — `npm pack` → `dist/`.
- `test_drive` — isolated plugin run (install → dump-config → headless boot → uninstall).

## 2. Results (current release)

- **Unit tests:** 19 modules — 162 checks + 7 summary modules, all green.
- **YAML validation** of `cordis.patch.yml` (`verify-yaml.mjs`) — OK.
- **`test_drive`** on the release tarball — PASS: install, patch, boot, uninstall confirmed.
- **Acceptance** (2026-10-26, release 1.1.0): manual run — 2 iterations: a single escalation with approval; rejection (button and Esc); three parallel requests; behavior when the main agent stops — the panel waits for the user's decision; toggle off — no escalations. Security audit: no critical or high findings.

## 3. Post-installation check

01. Restart DSH and open a **new session**: DSH sessions keep the plugin revision they started with.
02. In a new chat with a preset from the matrix, hidden tools are unavailable from the first turn (hide) or their calls are blocked (guard on a “dirty” history).
03. Subagents keep their full tool set.
04. Turn on the «Elevated permissions of subagents» toggle → a subagent requests elevated access → in the main chat a panel appears above the input box disclosing the action (preset, session, assignment, tool, arguments, justification) with «Allow (once)» / «Reject» buttons (button or Esc). Turn the toggle off → no requests.

## Notes

- After a DSH or plugin update, checks run only on new sessions after a restart.
- The report describes the test contour of the latest release: installing and using earlier versions is not implied — the latest package version is supported.
