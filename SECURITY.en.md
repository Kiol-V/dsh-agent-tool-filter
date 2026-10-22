# Security Policy — dsh-agent-tool-filter

Русская версия: см. [SECURITY.md](<SECURITY.md>).

## Supported versions

Security fixes are prioritized for the current release of the project.

| Version | Security support |
|---|---|
| `0.2.0` and above | supported for released versions |
| Below `0.2.0` | security support is not stated |

If you are unsure whether a version is affected, report against the latest release and include the exact version or commit you tested.

## Reporting a vulnerability

Please report security issues PRIVATELY. Do not open public issues with exploit details, secrets, crash dumps, or proof-of-concept payloads.

Preferred reporting path:

01. Contact copyright holder Kiol confidentially through a private channel available to you.
02. If no private channel is available, open a minimal public issue asking for a private contact path — without exploit details.

Please include:

- Affected project version, commit, operating system, and installation method.
- The plugin functionality involved.
- Reproduction steps using dummy credentials and non-sensitive files.
- Expected impact, such as bypassing the intended tool-visibility restriction or causing unintended plugin behavior.
- Logs with API keys, tokens, local paths, and personal data redacted.

Do not send real API keys, tokens, passwords, private workspace files, or third-party personal data.

## Security boundaries

`dsh-agent-tool-filter` is a DeepSeek Harness plugin that uses `tools.restrict()` in Agent-scope to limit which tool schemas are visible to the main agent model. This is a visibility restriction, not a sandbox or a security guarantee. Subagents retain the full set of tools.

Stated boundaries and limitations:

- The plugin filters tool-schema visibility for the main agent model; own-layer tools (for example, `team_task_*`) are not filtered by the platform's `restrict()`. The plugin warns about this in the log.
- Configuration consists of lists of tool names, not secrets or credentials. The code does not store or process secrets, tokens, or passwords.
- There are no external dependencies; the `@deepseek-ai/*` core is not copied.
- A filter-application error is logged and does not block DSH (fail-open). A configuration error disables the filter with a warning.
- The plugin is installed in a DSH profile (`node_modules`). Create a backup of the profile before updating.
- The visibility filter does not replace a sandbox for untrusted code.

Normally trusted inputs:

- The user's own configuration containing lists of tool names.
- Components installed and approved by the user.
- Tool invocation and isolation mechanisms provided by DSH; this plugin does not claim their sandbox guarantees or strengthen them.

Can be security issues:

- Behavior where the plugin fails to restrict visibility of applicable main-agent tool schemas despite valid configuration.
- Configuration handling or filter application that unexpectedly bypasses the stated visibility restriction.
- Disclosure of secrets or personal data caused by the plugin's own behavior.

## Out of Scope

Usually out of scope (unless they demonstrate a bypass of the stated boundary above):

- Visibility of tool schemas that the platform's `restrict()` does not filter, including own-layer tools; this is a platform limitation that the plugin reports in its log.
- The ability of subagents to use the full set of tools.
- Execution of untrusted code without a sandbox: the visibility filter is not a sandbox and is not intended to provide one.
- A filter-application error after which the system continues in fail-open mode, unless the error itself exposes data or bypasses a stated boundary.
- Vulnerabilities in DSH, third-party services, or components not caused by the plugin's behavior.

## Coordinated Disclosure

Copyright holder Kiol will review reports, ask follow-up questions when needed, and coordinate fixes before public disclosure for confirmed vulnerabilities.

Please give maintainers reasonable time to investigate and release a fix before publishing exploit details; if you plan to disclose on a timeline, include that timeline in your initial report.
