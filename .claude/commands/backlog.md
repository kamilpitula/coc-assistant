---
description: Reports PBI status, ready PBIs, unpromoted follow-ups, and git mismatch warnings from docs/*/issues/. Usage: /backlog [--check]
---

Run the backlog tool from the repository root and relay its output. The convention it reports on is in `docs/backlog.md`.

1. If `tools/backlog/node_modules` does not exist, run `npm ci --prefix tools/backlog`.
2. Run `node tools/backlog/src/cli.ts $ARGUMENTS`.
3. Show the output to the user as-is. With `--check`, also state whether it passed (exit code 0) or failed.

Do not edit PBI files to make the report or the check come out differently; report what it says.
