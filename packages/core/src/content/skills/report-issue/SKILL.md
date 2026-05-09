---
name: report-issue
description: "Use when the user wants to report a bug, file an issue, or send feedback. Triggers on phrases like 'report issue', 'file a bug', 'something is wrong', 'open an issue', '/report-issue'."
version: "1.0.0"
trigger_phrases:
  - "report issue"
  - "file a bug"
  - "something is wrong"
  - "open an issue"
  - "/report-issue"
tags: [process, communication]
---

# Report Issue

## When to Use

User reports bug ∨ unexpected behavior ∨ wants to file an issue against the tracker repo.

## HARD-GATE

¬ submit until user explicitly confirms issue body (filing publicly = irreversible). Show full draft → ask `submit? [y/N]`. Default = ¬ submit.

## Checklist

1. **Detect command** — verify `{{CLI_TOOL}}` available: `{{CLI_TOOL}} --version`. ¬ available → abort, instruct user to install the CLI tool configured for their environment and authenticate. Then check auth status — ¬ authed → instruct login.
2. **Collect context** — gather in parallel:
   - Version: read `{{VERSION_SOURCE}}` if configured.
   - node + OS: `node --version`, `uname -s -r`.
   - Recent state: `{{STATE_PATH}}` if exists (truncate ≤ 80 lines, scrub absolute paths under `/Users/<name>` → `~`).
   - User-supplied: error message, repro steps, expected vs actual.
3. **Classify** — ask user one question: `kind ∈ { bug, feature-request, question, docs }`. Default `bug`.
4. **De-dup check** — search existing issues with similar title via `{{CLI_TOOL}}`. If close match → show user, ask whether to comment on existing or file new.
5. **Draft** — render issue body per template below.
6. **Show draft** — present title + body to user verbatim.
7. **Confirm** — `submit? [y/N]`. ¬ y → save draft to a temporary path ∧ abort.
8. **Submit** — `{{CLI_TOOL}} issue create --repo {{REPO}} --title "<title>" --body-file <draft-path> --label <kind>`.
9. **Report** — print returned URL.

## Issue Template

````md
## Summary

<one-line>

## Environment

- version: <version>
- node: <version>
- OS: <uname>

## Repro

<steps>

## Expected

<what should happen>

## Actual

<what happened — include error verbatim ∈ ``` fence>

## Context

<details>
<summary>State excerpt (truncated)</summary>

<{{STATE_PATH}} excerpt — paths scrubbed>

</details>
````

## Output Format

- On success: `https://github.com/{{REPO}}/issues/<n>`
- On abort: path to saved draft
- On CLI tool missing: install instructions for the configured tool, ¬ partial state

## Anti-Patterns

- Submitting without showing the user the rendered body first (irreversible publish)
- Pasting full state file unredacted (may contain repo paths ∨ secrets — truncate ∧ scrub)
- Auto-classifying as `bug` when user said `feature` ∨ `question`
- Inventing repro steps the user didn't provide — ask, ¬ guess
- Filing against the wrong repo (always `{{REPO}}`, ¬ user's project repo)
- Re-submitting on retry without de-dup (step 4 is mandatory)

## Rules

- Repo target parameterized: `{{REPO}}`
- ∀ submission: user confirmation required
- ∀ context blob > 80 lines: truncate ∧ note `<truncated>`
- ¬ include secrets (env vars, tokens, absolute paths under `/Users/<name>` → mask to `~`)
- ¬ submit if auth status fails — instruct login instead
