# Operator Release Guide

How to cut and validate a release of `tff-cc`.

## Prerequisites

- Branch protection on the `release` branch must allow force-pushes from the release workflow (required by `scripts/sync-release-branch.sh`).

## Trigger

1. Merge a PR to `main`.
2. Wait for `release-please` to open a version-bump PR.
3. Review and merge the version-bump PR.
4. `.github/workflows/release.yml` runs automatically.

## Verification

After the workflow completes:

- [ ] GitHub Actions `release.yml` shows green.
- [ ] GitHub Release page has the `tff-cc-<tag>.tar.gz` artifact attached.
- [ ] `release` branch was force-pushed by the sync job.
- [ ] `.github/workflows/release-branch-validation.yml` is green on the `release` branch push (fires automatically).

## Failure Modes

### Validation red on `release` branch

If `release-branch-validation.yml` fails after the sync:

1. Open the failed Actions run and read the validation log.
2. Common causes: `dist/cli/index.js` missing, manifest mismatch, legacy `.tff/` directory leaked into the bundle.
3. Fix the cause on `main`, merge, and let release-please open a new bump PR.

### Rebuild-diff drift

`release-branch-rebuild-diff.yml` runs weekly and compares the SHA256 of a fresh rebuild against the shipped bundle. If it opens an issue:

1. Read the issue for the exact diff.
2. Investigate whether the drift is from a build non-determinism or an unaccounted source change.
3. Resolve on `main` and let the next release pick up the fix.

## Notes

- Do **not** manually bump versions, tag, or push. Release-please owns the version bump; the workflow owns the tag and artifact.
- Before trusting the sync script in production, smoke-test it against a throwaway fork — see the comment block at the top of `scripts/sync-release-branch.sh`.
- **v1.0.0 release** cut via release-please with `Release-As: 1.0.0` footer.
