# dsh-agent-tool-filter

[![CI](https://github.com/Kiol-V/dsh-agent-tool-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/Kiol-V/dsh-agent-tool-filter/actions/workflows/ci.yml)

Русская версия: см. [README.md](<README.md>).

A DeepSeek Harness host plugin that filters tool schemas per preset for the main agent while leaving subagents with their full tool set.

## Overview

The plugin maps selected agent presets to filter profiles, reducing the tool schemas exposed to the main agent. It applies restrictions in the agent's own scope; subagents retain their complete tool set, including web tools.

Filtering is opt-in by preset mapping. The plugin does not change existing presets unless they are explicitly mapped in its configuration.

## Before you install

01. **The platform may grow these features.** Per-agent tool filtering may become part of DSH itself. Check the current DSH release notes before installing — if the capabilities are already available natively, the plugin is not needed.
02. **Filtering applies to the main agent only.** Hidden tools are disabled for the main agent; subagents keep them available — the plugin does not transfer restrictions automatically. For end-to-end restriction:
    - give each subagent its own preset with the tools suited to its role. For example, a web-search subagent's preset might include only web tools and `read`; choose a different tool set for each other workflow;
    - give the main agent explicit scenarios: when a task needs a hidden tool, it must delegate the task to a subagent that has the tool instead of trying to call it directly.
    Without these settings the agent will hit the disabled tools instead of delegating — filtering will work, but the workflow will break.

Restricting tools through a preset is not suitable here: preset tool lists are fixed when a chat is created and are inherited by subagents, limiting them along with the main agent. The plugin's mask applies only to the main agent and can be changed without either limitation.

## Features

- Maps agent presets to named filtering profiles (card UI with a preset → profile matrix).
- Applies restrictions with `tools.restrict()` in the root agent's scope.
- Leaves in-process child agents and SDK subagents unaffected.
- One built-in profile (`balanced`) plus importable template packs; custom profiles with copy/edit in modal dialogs.
- Copies presets with their descriptions (built-ins take DSH display texts; custom presets keep their own metadata).
- Scans the installed tool palette («can be disabled / cannot be disabled» summary) and reports warnings with reasons.
- Russian and English UI (language switcher, «Same as app» mode).
- Diagnostics block with technical data (remote mount, locale, version, counters).
- File diagnostics: the `debugLog` toggle in plugin settings (off by default; changes apply immediately). The log is written to `<DSH_HOME>/logs/agent-tool-filter-debug.log`; `ATF_DEBUG_LOG=<path>` forces logging on with a custom file path.

## Tech stack

- **Platform:** DeepSeek Harness host plugin.
- **Dependencies:** None; the host provides the `@deepseek-ai/*` packages.

## Requirements

- A DeepSeek Harness installation with Plugin Manager access to install a bundle.
- The package supplies a default bundle entry; configure preset mappings and profiles in its UI card.

## Installation

Install the release tarball or a package directory from Plugin Manager with `plugin_manager` →
`install_bundle`, providing its path. For an npm package, obtain it in a location accessible to DSH
and pass the package directory to `install_bundle`. The manager installs and selects the bundle;
there is no need to edit the profile's `cordis.patch.yml` or unpack files into the profile by hand.
Restart DSH if needed to complete first activation. The package has no dependencies; the host
provides `@deepseek-ai/*` modules.

## Usage

Filtering is disabled until you configure a `preset → profile` mapping. The package supplies a bundle entry with safe defaults; configure mappings and profiles in the UI card. Changes apply hot (HMR). The example below shows the configuration shape:

~~~yaml
- insert:
    - id: agent-tool-filter
      name: dsh-agent-tool-filter
      config:
        enabled: true
        behavior: auto               # auto picks hide/block by history; hide or block pin the mode
        debugLog: false              # file diagnostics of the filtering steps
        language: auto               # plugin UI language: auto/ru/en
        presets:                    # matrix "preset id → profile name"; empty = filter nothing
          cordis: cordis-trim
          standard: minimal-orchestrator
        profiles:                   # custom profiles and built-in overrides (by name)
          my-profile:
            mode: deny              # deny — remove the listed; allow — keep only them
            tools: [web_search, web_fetch]
~~~

| Field | Default | Description |
|---|---|---|
| `enabled` | `true` | `false` makes the plugin passive |
| `behavior` | `auto` | Compatibility mode: `auto` picks by history, `hide` trims schemas (see the risk note), `block` keeps schemas visible but blocks selected calls |
| `debugLog` | `false` | File diagnostics of the filtering steps (the log path is shown in the Diagnostics block) |
| `presets` | empty | Maps preset IDs to profile names; nothing is filtered until a mapping is added |
| `profiles` | built-in profiles | Defines profiles or overrides built-in profiles by name. In `deny` mode the listed tools are removed; in `allow` mode only the listed tools are retained |
| `language` | `auto` | Plugin UI language: `auto` follows the app, or pin `ru` / `en` |

⚠ **Risk of the `hide` mode:** pinned schema hiding does not protect against strict-provider
errors — if the chat history still contains calls to hidden tools, turns may fail with
“The provider returned an invalid tool call”. The `auto` mode picks safe behavior from the
history on its own; pin `hide` only when the history is clean or your provider is lenient.

See the [filtering guide](<docs/filtering-guide.en.md>) for the full setup, scan, verification, and rollback workflow.

### Profiles and template packs

One universal profile is installed by default; the rest are added by importing template packs from the UI card.

| Profile / pack | Tools denied | Purpose |
|---|---|---|
| `balanced` (built-in) | `plugin_manager`, `security_audit`, `test_drive`, `drive_report`, `create_skill`, `subagent_fork` | Baseline trimming for any preset |
| pack `gradient` | `strict` (admin + web), `soft` (web) | Restriction steps around `balanced` |
| pack `roles` | `focus`, `no-web`, `no-admin`, `minimal` | Profiles by purpose |
| pack `layers` | `no-web`, `no-admin`, `no-dev-skills` | One category per profile; combine with copies |

Any profile can be copied and edited (custom tool lists, `deny`/`allow` mode); the built-in `balanced` can be overridden by name but not deleted.

### What installation does

The package installs the plugin files and a bundle entry with safe defaults. On first activation, the plugin scans the installed DSH tools and compares profile names with the available set. Filtering remains disabled until you configure a `preset → profile` mapping in the UI card. Changes apply hot (HMR). See the [filtering guide](<docs/filtering-guide.en.md>) for details.

### Name validation and diagnostics

At startup and when `agentToolFilter.scanTools()` is called, the plugin compares profile tool names with the global tool list. Unknown names and names that cannot be filtered are reported as warnings rather than silently ignored. `restrict()` also validates names when applying a profile; an unknown name does not prevent the other deny rules from applying.

The plugin logs the number of tool schemas hidden by an applied filter. The host service `agentToolFilter.status()` exposes per-agent hidden-tool counts, and `scanTools()` reports actual tool names and warnings.

### Reversibility and limitations

Configuration and matrix changes are applied to live agents on a best-effort basis (hot-apply). The reliable paths are restarting DSH or recreating the chat (clear/resume): the agent scope is recreated and the filter is applied anew. The filter applies to agents created or resumed after the change.

To remove a filter from a particular preset, remove its mapping from `presets`. Restrictions are disposed from the agent scope when they are removed.

`tools.restrict()` controls tool visibility to the model and can reduce tool-schema overhead; it is not a security sandbox or a security guarantee. Tools registered in the plugin's own layer or dynamically — for example `team_*`, `team_task_*`, `spawn_teammate`, `wait_agent` — are not filtered by `restrict()`.

The settings UI card opens from the Plugin Manager: the `dsh-agent-tool-filter` row → Configure. It includes the enable toggle and status, the “File diagnostics” toggle (step-by-step filtering log; the file path is shown in the Diagnostics block), a preset → profile matrix (default and custom blocks), profile editing in modal dialogs (problem names — typos, “the limiter rejects the mask” — get an active checkbox with a note; uncheck and save to remove the name), template pack imports, a tool-palette scan summary with warnings (each “not found” warning offers a “Remove name from profile” button), a collapsed diagnostics block, and a Russian/English language switcher. Plugin Manager display metadata is available in English and Russian, with an original bundled icon.

## Provider compatibility

The plugin chooses its working mode **automatically** — there are no separate settings for it.

- Strict providers validate tool calls from the conversation history against the current tool list: if a tool's schema is hidden while its calls remain in the history, the request fails with a provider error (“The provider returned an invalid tool call”). Lenient providers accept such a history.
- When the agent's history already contains calls to tools being hidden, the plugin temporarily keeps the schemas visible and instead blocks calls to hidden tools with a hint to delegate the task to a subagent — the history and the tool list stay consistent for both strict and lenient providers.
- After compaction (history summarization) the chat switches to regular schema hiding — context savings engage automatically (verified: after compaction the hidden schemas disappear from the request).
- If the hidden tools were never called in the chat, schema hiding engages immediately — even in an old chat (verified: the chat runs without errors).

## Web environment specifics (since 1.0.1)

01. New chats: the filter is stable — the mask applies at agent creation and hide mode (schema trimming) is visible from the first turn.
02. Old chats with a “dirty” history (calls to hidden tools): auto mode keeps guard — schemas stay in the list, hidden tool calls are blocked. This protects against the “Provider returned an invalid tool call” error on strict providers.
03. Guard → hide is reconsidered on mode re-evaluation: after compaction (since 1.0.1), on agent preset change, or on DSH restart. If the compaction summary mentions hidden names, the mode intentionally stays guard (conservative protection); hide comes once the history stops mentioning them.
04. To observe diagnostics: the `debugLog` toggle in plugin settings or the `ATF_DEBUG_LOG` variable.

## Repository structure

| Directory / file | Purpose |
|---|---|
| `cordis.patch.yml` | Bundle patch with the plugin entry and safe defaults |
| `lib/`, `client/`, `plugin.mjs` | Plugin sources (host and client) |
| `docs/` | Filtering guides (RU/EN) |
| `test/` | Test scripts (`*.test.mjs`) and the [testing report](<test/TESTING.md>) |
| `README.md` / `README.en.md` | Russian / English project documentation |
| `LICENSE` / `LICENSE.en` | MIT license (RU / EN) |
| `SECURITY.md` / `SECURITY.en.md` | Security policy (RU / EN) |

## Versions and releases

Versions and release notes are published in the repository's [GitHub Releases](https://github.com/Kiol-V/dsh-agent-tool-filter/releases).

## Contributing

Contribution guidelines are available in [CONTRIBUTING.md](<CONTRIBUTING.md>) (RU) and [CONTRIBUTING.en.md](<CONTRIBUTING.en.md>) (EN). Before contributing, run `node --check` for changed files and the tests: `node --test test/`.

## Security

See the security policy in [SECURITY.en.md](<SECURITY.en.md>) (RU: [SECURITY.md](<SECURITY.md>)).

## License

MIT — see [LICENSE](<LICENSE>). Copyright (c) 2026 Kiol.

## Contacts

- Kiol — [https://github.com/Kiol-V](https://github.com/Kiol-V)
