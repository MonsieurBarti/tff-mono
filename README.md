<p align="center">
  <img src="apps/tff-cc/assets/forge-banner.png" alt="The Forge Flow" width="800" />
</p>

<h1 align="center">tff-mono</h1>

<p align="center">
  Monorepo for The Forge Flow clients — <code>tff-cc</code> (Claude Code) and <code>tff-pi</code> (PI).<br/>
  Maintained side-by-side toward functional parity.
</p>

<p align="center">
  <a href="#layout">Layout</a> |
  <a href="#install">Install</a> |
  <a href="#common-commands">Commands</a> |
  <a href="#adding-an-app">Adding an app</a> |
  <a href="#parity-intent">Parity</a>
</p>

---

## What is tff-mono?

`tff-mono` is the home of both Forge Flow client implementations. It exists so the two clients (`tff-cc` for Claude Code, `tff-pi` for PI) evolve in lockstep toward functional parity, sharing the same lifecycle vocabulary and — eventually — the same extracted core packages.

## Layout

```
apps/
  tff-cc/    # Claude Code plugin (the original)
  tff-pi/    # PI coding agent integration
tools/
  repo-root-lint/  # workspace covering root-only files via Turbo
.github/workflows/ # CI
package.json       # root scripts (build/test/lint/format/typecheck/verify)
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
.oxlintrc.json / .prettierrc.json (+ ignores)
lefthook.yml
```

Note: `.tff-cc/` at the repo root is a per-developer symlink into `~/.tff-cc/<projectId>/`. It is gitignored and created by `tff-tools project:init`.

## Prerequisites

- Node ≥ 22
- pnpm 11 (managed via `packageManager` in `package.json` — Corepack will pick the right version)
- Git

## Install

```bash
pnpm install
```

Run from the repo root. pnpm will hydrate every workspace under `apps/*` and `tools/*`.

## Common commands

All run from the repo root and fan out via Turbo:

```bash
turbo run build         # build every app
turbo run test          # run every app's vitest suite
turbo run lint          # oxlint across apps + repo-root-lint
turbo run format        # oxfmt --write across the repo
turbo run format:check  # oxfmt --check (CI-friendly)
turbo run typecheck     # tsc --noEmit per app
turbo run typecheck lint format:check test build  # the "everything passes" gate
```

Per-app filter:

```bash
pnpm --filter @the-forge-flow/tff-cc test
pnpm --filter @the-forge-flow/tff-pi build
```

## Adding an app

1. Create the workspace under `apps/<name>/` with a `package.json` declaring `name`, `version`, `scripts`, and (if needed) `dependencies`.
2. The workspace is already covered by `pnpm-workspace.yaml`'s `apps/*` glob — no edit required.
3. Implement the standard scripts so Turbo can fan out: `build`, `test`, `lint`, `format`, `format:check`, `typecheck`.
4. Run `turbo run typecheck lint format:check test build` from the repo root to confirm the new app participates in the pipeline.

## Parity intent

`tff-cc` and `tff-pi` are intentionally maintained in parallel toward functional parity. Shared-package extraction (a single source of truth for skills, agents, and lifecycle code) is a future milestone — until then, both apps own their internal toolchains.

## License

MIT.
