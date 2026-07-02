---
name: upgrade-deps
description: Upgrade this repo's npm dependencies to their latest versions — auto-apply patch/minor, research and gate major bumps, prune stale package overrides, and clear npm audit vulnerabilities. Triggers on: upgrade dependencies, update deps, bump packages, dependency audit, npm audit fix, check for outdated packages.
---

# Upgrade dependencies (libs monorepo)

This repo is an npm-workspaces + Nx monorepo (`package-lock.json` at the root,
workspaces under `packages/*`: `core`, `entity`, `git-lib`). All commands run
from the repo root with plain `npm` — do not use pnpm/yarn.

`@rtpaulino/*` packages (`@rtpaulino/core`, `@rtpaulino/entity`,
`@rtpaulino/git-lib`) are internal workspace packages, not external
dependencies. Never "upgrade" them through this flow — their versions are
managed by the repo's own release process (see `chore(release): publish`
commits). Skip them when scanning outdated/major packages.

## 1. Inventory outdated packages

```
npm outdated --workspaces --include-workspace-root --json
```

Parse the JSON (keys are package names, values include `current`, `wanted`,
`latest`, and `location`/workspace). Drop any `@rtpaulino/*` entries. Split
the rest into two groups:

- **Minor/patch**: `latest` has the same major version as `current`.
- **Major**: `latest`'s major version is greater than `current`'s.

## 2. Apply minor/patch upgrades

```
npm update --workspaces --include-workspace-root
```

This respects the caret ranges already declared in each `package.json`, so it
only moves within the current major. Confirm `npm outdated` no longer lists
those packages under minor/patch.

## 3. Evaluate each major upgrade

For every package in the major group, in parallel:

**a. Research the jump.** Fetch the changelog/release notes (GitHub
releases, `CHANGELOG.md`) covering every major version between `current` and
`latest`. Summarize the breaking changes.

**b. Check real usage.** Grep `packages/*/src` (and root config files) for
how the package is imported/used — which APIs, options, or config shape it
relies on.

**c. Decide.**
- If none of the breaking changes touch how this repo uses the package:
  upgrade it directly in the owning `package.json` (root devDependency or
  the specific workspace) to the new `^<latest>` range, then
  `npm install`.
- If a breaking change plausibly affects this repo's usage, but the fix is a
  small, mechanical, well-documented change: apply the code change and the
  upgrade together, and call it out clearly in the summary.
- If the migration is genuinely complex (rewritten config format, removed
  APIs with no direct replacement, framework-level rework, unclear
  migration path): **do not upgrade it**. Leave it on the current version
  and report it to the user with the package name, current → latest
  version, and a short reason it's too risky to do unattended.

## 4. Audit existing `overrides`

Check the root `package.json` for an `overrides` block (there may be none
right now — that's fine, skip to step 5 if so). For each existing override
entry:

1. Note why it likely exists (usually a forced transitive-dependency bump
   for a security fix — check `git log -p -- package.json` for the commit
   that introduced it if the reason isn't obvious).
2. Temporarily remove the entry and run `npm install`.
3. Run `npm ls <package>` to see what version the tree now resolves to
   naturally, and `npm audit` to check nothing regresses.
4. If the natural resolution already satisfies the override's intent (same
   or newer version, no new vulnerability introduced) — leave it removed,
   it's no longer necessary.
5. If removing it downgrades the package or reintroduces a vulnerability,
   restore the override.

## 5. Run `npm audit` and resolve remaining vulnerabilities

```
npm audit --workspaces --include-workspace-root
```

- If it's clean, move on.
- If vulnerabilities remain after steps 2–4, try `npm audit fix` first (no
  `--force`, since that can silently jump majors outside this skill's
  review process).
- For anything `npm audit fix` can't resolve, add or adjust an entry in the
  root `package.json` `overrides` field to pin the vulnerable transitive
  dependency to a patched version. Re-run `npm install` then `npm audit` to
  confirm the advisory is gone.
- If a vulnerability has no available fix at all (no patched version
  exists upstream), leave it and report it explicitly to the user rather
  than guessing at a workaround.

## 6. Verify

```
npx nx run-many -t lint test build typecheck
```

This mirrors what CI (`.github/workflows/ci.yml`) runs. All targets must
pass before considering the upgrade done. If something fails because of an
upgrade applied in step 2 or 3, fix it or, for a major bump, fall back to
not upgrading that package (per step 3c) and note why.

## 7. Report

Summarize for the user:
- Minor/patch packages upgraded (just the count is fine, `git diff` has detail).
- Major upgrades applied, with the version jump.
- Major upgrades **skipped**, with the specific breaking change and why it's
  too risky to automate.
- Overrides removed (no longer necessary) and overrides added/changed (with
  the vulnerability they address).
- Final `npm audit` status.

Do not commit or push — leave staged/unstaged changes for the user to review
and ask before committing, per this repo's normal workflow.
