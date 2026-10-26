# Configuring Tool Filtering — User Guide

Русская версия: см. [filtering-guide.md](<filtering-guide.md>).

This guide covers installation, configuration, verification, and rollback. It describes the plugin for **DSH 0.2.1-rc.2**.

## What the plugin does

The plugin limits tools only for the **main agent** — the agent you interact with in the chat. With `hide`, selected schemas disappear from the model request; with `block`, schemas remain visible but calls to selected tools are blocked. Subagents use their own agent presets: the plugin mask does not affect them.

Important: this limits visibility or calls; it is not sandboxing or authorization. See [SECURITY.en.md](<../SECURITY.en.md>) for details.

## Two features: tool restriction and elevated permissions

The plugin ships two independent features: tool restriction for the main agent (filtering, the preset → profile matrix) and subagent elevated permissions (escalation, the “Subagent elevated permissions” toggle, `subagentEscalation`). Elevated permissions are off by default. The features do not depend on each other and run in three modes:

- **tool restriction only** — the filter trims the main agent's tool set; subagents work with their own set and no escalation;
- **elevated permissions only** — no filter is configured; a subagent that lacks a tool requests elevated access, and the user approves each call in the panel above the input box;
- **both features** — restriction and escalation enabled at once: tools hidden from the main agent stay available to subagents, and when a subagent itself lacks a tool, the approval path engages.

## Step 0. Installation and first activation

01. In Plugin Manager, run `plugin_manager` → `install_bundle` and select the package `.tgz` archive or the unpacked package directory. To update, install the latest version the same way. You do not need to edit the profile manually or unpack the package into a DSH folder.
02. Restart DSH if prompted. The plugin has its own icon and localized Russian/English metadata in Plugin Manager.
03. On first activation, the plugin scans the installed DSH. While the preset-to-profile matrix has no bindings, filtering does not change any preset's behavior.

## Step 1. First run: scan

On first activation, the plugin scans the installed DSH. The settings card shows a summary of the tool palette: how many tools **can be disabled** and how many **cannot be disabled**. Counts depend on the tools available in your installation.

While the matrix has no bindings, filtering is not applied to any preset.

## Step 2. Your tool set

Open the plugin card in Plugin Manager → Configure:

- The preset-to-profile matrix lists presets in two alphabetical groups: built-in and custom. Each preset can have one profile; one profile can be used by multiple presets.
- The “Filtering enabled” toggle and status (agents with a mask, hidden schemas); the “File diagnostics” toggle turns the step-by-step filtering log on/off (the file path is shown in the Diagnostics block); the “Subagent elevated permissions” toggle turns subagent permission escalation via user approval on/off.
- In **Profiles**, create, edit, or copy a profile in a modal editor. The built-in `balanced` profile covers administrative tools; other profiles are user-created, and a custom profile named `balanced` overrides the built-in one. The editor groups enabled, disabled, and uncontrollable tools; problem names (typos, “the limiter rejects the mask”) get an active checkbox and a note — uncheck and save to remove the name from the profile.
- Template packs provide starting points: **Gradient** (`strict`, `soft`), **Roles** (`focus`, `no-web`, `no-admin`, `minimal`), and **Layers** (`no-web`, `no-admin`, `no-dev-skills`).
- The language selector supports Russian, English, or the application language. A temporary status appears under the section where an action was performed.
- Use the tool-scan palette for available names; expand **Diagnostics** for the technical summary. The UI scan is the source for the available tool names.

## Step 3. Enable filtering

In the matrix, select a preset and profile, then click **Bind**. To change the profile, select another and click **Replace**; **Unbind** removes the binding. Changes apply live. Presets outside the matrix run without a mask.

A preset may not yet be bound when a session is created. Once the preset is selected, the plugin applies its current binding; this behavior is supported since version 0.3.1.

Configuration fields, if you configure them outside the card:

| Field | Purpose |
|---|---|
| `enabled` | Enables (`true` by default) or disables filtering. |
| `behavior` | `auto` (default) selects a safe mode based on conversation history; `hide` hides schemas (see the risk note), while `block` keeps schemas visible but blocks selected calls. |
| `language` | `auto` (default), `ru`, or `en` — the interface language. |
| `debugLog` | `false` (default) — file diagnostics of the filtering steps; see the “File diagnostics” section. |
| `profiles` | An object mapping profile names to `{ mode, tools }`. `mode: deny` disables the listed tools; `mode: allow` keeps only the listed tools. |
| `presets` | An object mapping preset IDs to profile names. An empty object means no preset is filtered. |
| `subagentEscalation` | `false` (default) — `true` lets subagents request elevated access with mandatory user approval; `false` — subagents run without escalation. |

⚠ **Risk of the `hide` mode:** pinned schema hiding does not protect against strict-provider
errors — if the chat history still contains calls to hidden tools, turns may fail with
“The provider returned an invalid tool call”. The `auto` mode picks safe behavior from the
history on its own; pin `hide` only when the history is clean or your provider is lenient.

Example filter configuration for a main-agent preset (a `config` fragment; replace
`main-preset` with an actual preset ID — the full set of fields is in the table above):

~~~yaml
presets:
  main-preset: lean-main
profiles:
  lean-main:
    mode: deny
    tools: [plugin_manager, security_audit]
~~~

In DSH 0.2.1-rc.2, subagent configuration no longer has `toolFilter` or `persona` fields. A subagent's own agent preset defines its tool set. For example, give a dedicated web-search subagent preset the tools `web_search`, `web_fetch`, and `read`. Changes to the tool list in an agent preset may be inherited by child subagents; the plugin mask, in contrast, applies only to the main agent.

## Step 4. Verify

To verify an installation or configuration change, restart DSH and open a **new session** with the intended preset. DSH pins plugin revisions for existing sessions, so a new session after restart is the reliable way to check the current version.

Check that:

01. Tools in the profile are hidden or their calls are blocked, according to the selected `behavior`.
02. The card status updates and **Diagnostics** displays the `presets · profiles · tools: N` counters.
03. A web-search subagent with its own preset containing `web_search`, `web_fetch`, and `read` can still search. The plugin mask applies only to the main agent.

For existing conversation history that contains calls to selected tools, `auto` preserves compatibility with the provider: it temporarily keeps schemas visible but blocks those calls. Once the history is cleared (for example, by compaction), it switches to hiding schemas. If the history is clean, schemas are hidden immediately.

## Step 5. Rollback

- Click **Unbind** for a preset in the matrix to remove its mask immediately.
- Turn off **Filtering enabled** to disable filtering globally; the equivalent configuration is `enabled: false`.
- If you configure the plugin manually, an empty `presets: {}` removes all bindings. Matrix and configuration changes apply live. To verify an updated plugin version, open a new session after restarting DSH.

## Customize

Create or copy a profile in the card, choose its mode, and select the tools. In configuration, profiles are defined under `profiles`:

~~~yaml
presets:
  standard: my-profile
profiles:
  my-profile:
    mode: deny
    tools: [web_search, web_fetch, plugin_manager]
~~~

- With `deny`, the listed tools are disabled; with `allow`, only listed tools remain available. Choose names from the scan palette.
- Glob patterns such as `team_task_*` are not supported; use exact names.
- `run_code` is reserved and cannot be added to a profile. A custom profile with the same name as a built-in profile replaces its settings.

## Diagnostics

- The scan palette marks tools that can be disabled with `✅` and tools that cannot with `⚠`. The warning `⚠ cannot be disabled (N)` lists uncontrollable tools, including own-layer tools and reserved names such as `run_code`; the filter cannot affect them.
- `❌` beside a warning means the tool name was not found. Check its spelling or whether the tool is available in DSH — or click “Remove name from profile” right in the warning (the name is dropped from every profile). An unknown profile in manual configuration is not applied; the configuration-validation warning is written to the DSH log.
- Expand **Diagnostics** for technical information, including the log file path and the `presets · profiles · tools: N` counters.
- A status below a section reports the latest action. For details about applying the filter, check the DSH diagnostic log.

### File diagnostics (`debugLog`)

The `debugLog` option (boolean, `false` by default) enables the step-by-step diagnostic log of the filtering pipeline, written to `<DSH_HOME>/logs/agent-tool-filter-debug.log` (fallback without `DSH_HOME` — `<os.tmpdir()>/agent-tool-filter-debug.log`). Toggle it with the “File diagnostics” switch in the plugin settings; changes apply immediately. The `ATF_DEBUG_LOG` environment variable is a forced override: it enables logging regardless of the option and sets the log file path (for example, `ATF_DEBUG_LOG=C:\temp\atf.log`).

## FAQ

- **A tool cannot be disabled.** Check its status in the scan palette. Tools marked `⚠` cannot be restricted by the mask; also check the profile name and matrix binding.
- **Changes do not appear in the current session.** Matrix, toggle, and profile changes apply live. However, after a plugin update, verify it in a new session after restarting DSH: an existing session may continue using its pinned plugin revision.
- **How do I give a subagent web access?** Assign it its own agent preset with the required tools. The plugin mask affects only the main agent; changes to a preset's tool list may be inherited by subagents, so set their tool access in their own preset.

## Web environment specifics

In old chats whose history contains calls to hidden tools, auto mode keeps guard (protection from strict-provider errors); hide engages after compaction/preset change/restart and only once the history stops mentioning hidden names. See “Web environment specifics” in the README for details.
