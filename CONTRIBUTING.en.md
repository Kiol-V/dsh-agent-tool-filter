# Contributing to `dsh-agent-tool-filter`

Русская версия: см. [CONTRIBUTING.md](<CONTRIBUTING.md>).

Thank you for your interest in contributing to the project! This guide covers how to propose changes.

## Requirements

- Node.js, with support for JavaScript ESM and the built-in `node:test` and `node:assert` modules.
- No external dependencies are required for tests.
- The DeepSeek Harness host provides the `@deepseek-ai/*` core: do not import or copy it into the project.

## Getting started

~~~text
node --test test/
~~~

No project dependencies need to be installed to run the tests. Before development, check the syntax of changed files with `node --check <path-to-file>`.

## Repository structure

| Directory / file | Purpose |
|---|---|
| `plugin.mjs` | Thin plugin entry point. |
| `lib/` | Modules, each with one responsibility. |
| `test/` | Project tests; the final test report for a public release is also placed here. |
| `client/` | UI sources. |
| `scripts/` | Client bundle build (`build.mjs`). |
| `docs/` | Guides. |
| `dist/` | Package tarball builds (`npm pack`). |
| `cordis.patch.yml` | Platform bundle patch. |

The code uses JavaScript ESM. Save files as UTF-8 without a BOM. Put shared logic in shared modules rather than duplicating it.

## Development workflow

- Checks: run `node --check` for every project file, then run `node --test test/`; tests must exit with code 0 before contributing. Also run the plugin in isolation using `test_drive`.
- Code style: aim for around 400 lines per file and around 80 lines per function. These are guidelines, not strict limits.
- The project does not prescribe a commit message format; use clear messages that describe the change.
- For a public release, include the final test report in `test/`.

## Pull request policy

01. Keep each pull request focused on one change or one related topic.
02. Describe what changes and why, and list the checks you ran.
03. Check syntax and run the tests; for behavior changes, add or update the relevant tests.

## Reporting issues

- Report bugs and vulnerabilities to copyright holder Kiol according to the instructions in `SECURITY.md`.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see `LICENSE`, MIT; Copyright (c) 2026 Kiol).

