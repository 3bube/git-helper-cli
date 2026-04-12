# Git Operations Expansion — Design Spec

**Date:** 2026-04-11
**Status:** Approved

---

## Context

`git-helper-cli` currently exposes `status`, `push` (with AI commit message generation), `pull`, `commit-msg`, and `config`. The goal is to add 5 new commands covering the git operations most commonly needed by both senior and junior engineers: branch management, stash, rebase, reset, and cherry-pick.

**Design principles:**
- Safe by default for everyone — dangerous operations always show a confirmation with context-aware explanation before executing
- `--yes` flag skips confirmations for senior engineers who know what they want (except `reset --hard`, which always confirms)
- Explanations are static but dynamic — templates populated with real repo state (file names, counts, branch names), no AI required, works without an API key
- Ink/React rendering throughout, following the established `render(<Flow />)` + `await waitUntilExit()` pattern

---

## Architecture

### New files

```
bin/commands/
  branch.tsx       — subcommands: list, create, switch, delete
  stash.tsx        — subcommands: save, pop, list, apply
  rebase.tsx       — git-helper rebase [target] [--abort|--continue] [--yes]
  reset.tsx        — git-helper reset [ref] [--soft|--mixed|--hard] [--yes]
  cherry-pick.tsx  — git-helper cherry-pick [--from <branch>]

bin/components/
  SelectList.tsx   — arrow-key interactive list picker (wraps @inkjs/ui Select)
  ConfirmPrompt.tsx — "Are you sure? (y/N)" step (wraps @inkjs/ui ConfirmInput)
```

### New types in `git.ts`

```typescript
interface Branch {
  name: string;
  current: boolean;
  upstream: string | null;
  merged: boolean;
}

interface StashEntry {
  index: number;
  message: string;
  date: string;
}
```

### Existing files touched

| File | Change |
|---|---|
| `bin/git.ts` | Append new functions only — nothing existing modified |
| `bin/index.ts` | Add 5 new `.command()` blocks |

---

## Command Specifications

### `git-helper branch`

Commander routing: `git-helper branch <subcommand> [name] [--switch] [--force] [--yes]`

#### `branch list`
- Lists all local branches
- Current branch marked with `◆` in primary colour
- Each row shows: marker, name, upstream tracking ref (muted), `merged` badge if fully merged into HEAD
- No confirmation, no async — one-shot render then exit

#### `branch create <name>`
- Creates the branch with `git branch <name>`
- After creation, shows `ConfirmPrompt`: *"Switch to `<name>` now?"*
- `--switch` flag skips the prompt and always switches
- `--yes` flag skips the prompt and does NOT switch (create only)
- Error if branch already exists: `<Panel variant="error" title="Branch already exists">`

#### `branch switch [name]`
- If `name` provided: switches directly
- If `name` omitted: shows `SelectList` of all branches (excluding current)
- If working tree is dirty: `ConfirmPrompt` — *"You have N unstaged changes — they will carry over to `<name>`. Continue?"*
- `--yes` skips dirty-tree confirmation
- Error if target branch doesn't exist

#### `branch delete <name>`

Four-case matrix:

| Branch state | Flags | Behaviour |
|---|---|---|
| Merged | _(none)_ | `ConfirmPrompt` then delete |
| Merged | `--yes` | Delete silently |
| Unmerged | _(none)_ or `--yes` | `<Panel variant="warning">` — *"Unmerged commits. Use --force."* Exit 0, no deletion |
| Unmerged | `--force` | `ConfirmPrompt` then delete |
| Unmerged | `--force --yes` | Delete silently |

---

### `git-helper stash`

Commander routing: `git-helper stash <subcommand> [args]`

#### `stash save [message]`
- Runs `git stash push -u -m "<message>"` (includes untracked)
- Shows what was stashed: file count and stash name
- `<Panel variant="success">` on completion

#### `stash pop`
- Pops the most recent stash (`git stash pop`)
- If stash list is empty: `<Panel variant="info" title="Nothing to pop">`
- If conflicts after pop: `<Panel variant="warning">` listing conflicting files + hint: *"Resolve conflicts then run `git add .`"*

#### `stash list`
- Renders a table of all stashes: index, message, date
- If no stashes: `<Panel variant="info" title="No stashes">`
- One-shot render then exit

#### `stash apply <index>`
- Shows `ConfirmPrompt`: *"Apply stash@{N}: `<message>`?"*
- `--yes` skips confirmation
- Applies without dropping (stash remains in list)
- Conflict handling same as `stash pop`

---

### `git-helper rebase [target]`

Commander routing: `git-helper rebase [target] [--abort] [--continue] [--yes]`

#### Normal flow
- `target` defaults to current branch's upstream (e.g. `origin/main`); error if no upstream and no target given
- Pre-flight: fetches commit count ahead of target (`git rev-list --count target..HEAD`)
- Shows `ConfirmPrompt`: *"Rebase N commit(s) onto `<target>`?"*
- `--yes` skips confirmation
- On success: `<Panel variant="success">` with summary

#### In-progress rebase detection
- On startup, checks `isRebasing()` (tests for `.git/rebase-merge` directory)
- If rebase in progress and no `--abort`/`--continue` flag: shows `<Panel variant="warning">` — *"A rebase is in progress. Use --continue or --abort."*

#### `--continue`
- Runs `git rebase --continue`
- Requires no unstaged changes; if dirty: `<Panel variant="warning">` — *"Stage your resolved conflicts first."*

#### `--abort`
- Always shows `ConfirmPrompt`: *"Abort the rebase and return to the original branch?"*
- `--yes` skips confirmation

#### Conflict exit
- Detects non-zero exit from rebase with conflict markers
- Shows `<Panel variant="warning" title="Rebase paused — conflicts">` listing conflicting files
- Exits 0 (user action required, not a crash)

---

### `git-helper reset [ref]`

Commander routing: `git-helper reset [ref] [--soft|--mixed|--hard] [--yes]`

- `ref` defaults to `HEAD`
- `mode` defaults to `--mixed`

#### Confirmation messages by mode

| Mode | Warning level | Message |
|---|---|---|
| `--soft` | Info | *"N commits will be uncommitted. Changes stay staged."* |
| `--mixed` | Info | *"N commits will be uncommitted. Changes become unstaged."* |
| `--hard` | Danger | *"This will permanently discard your N unstaged changes in `file1`, `file2`… This cannot be undone."* |

- `--yes` skips confirmation for `--soft` and `--mixed`
- `--hard` **always** shows `ConfirmPrompt` — `--yes` has no effect on it. This is intentional.
- Affected files list comes from `getAffectedFiles(ref)` — real repo state, not a generic message
- On success: `<Panel variant="success">` with mode and ref summary

---

### `git-helper cherry-pick`

Commander routing: `git-helper cherry-pick [--from <branch>]`

- If `--from <branch>` is omitted: first shows a `SelectList` of all other branches to pick the source, then shows the commit picker
- If `--from <branch>` is provided: goes straight to the commit picker
- Shows `SelectList` of last 20 commits from the source branch: `shortHash  message  date`
- After selection: shows diff stat for that commit + `ConfirmPrompt`: *"Cherry-pick `<shortHash>`: `<message>`?"*
- `--yes` is not supported — selection is inherently interactive
- On conflict: `<Panel variant="warning" title="Cherry-pick paused — conflicts">` listing files + hint

---

## New `git.ts` Functions

All appended after the existing `pull()` function. Nothing existing is modified.

```typescript
// Branch
export function getBranches(): Branch[]
export function createBranch(name: string): void
export function switchBranch(name: string): void
export function deleteBranch(name: string, force: boolean): void
export function isBranchMerged(name: string): boolean
export function hasUncommittedChanges(): boolean

// Stash
export function stashSave(message?: string): void
export function stashPop(): void
export function stashApply(index: number): void
export function stashList(): StashEntry[]

// Rebase
export function rebase(target: string): void
export function rebaseAbort(): void
export function rebaseContinue(): void
export function isRebasing(): boolean
export function getCommitCount(base: string): number

// Reset
export function reset(ref: string, mode: "soft" | "mixed" | "hard"): void
export function getAffectedFiles(ref: string): string[]

// Cherry-pick
export function cherryPick(hash: string): void
export function getLogFrom(branch: string, count: number): GitLog[]
```

---

## New Ink Components

### `SelectList.tsx`

```typescript
interface SelectListProps<T> {
  items: Array<{ label: string; value: T }>;
  onSelect: (value: T) => void;
}
```

Wraps `@inkjs/ui` `Select`. Generic over the value type. Used by `branch switch`, `cherry-pick`.

### `ConfirmPrompt.tsx`

```typescript
interface ConfirmPromptProps {
  message: string;
  danger?: boolean;          // renders message in danger colour
  onConfirm: () => void;
  onCancel: () => void;
}
```

Wraps `@inkjs/ui` `ConfirmInput`. `danger` prop renders the message in `#F87171`. Used by all commands that need confirmation.

---

## Error Handling Summary

| Situation | Exit code | UI |
|---|---|---|
| Git operation succeeds | 0 | `<Panel variant="success">` |
| User declines confirmation | 0 | Silent exit or `<Panel variant="info">` |
| Informational no-op (nothing to pop, already on branch) | 0 | `<Panel variant="info">` |
| Conflict requiring user action | 0 | `<Panel variant="warning">` + instructions |
| Unmerged branch without `--force` | 0 | `<Panel variant="warning">` |
| Git operation fails (stderr) | 1 | `<Panel variant="error">` with stderr message |
| Not a git repo | 1 | chalk `box()` before render (same as existing commands) |

---

## Verification

```bash
npm run build                                      # zero TS errors

# Branch
node dist/index.js branch list
node dist/index.js branch create test-branch
node dist/index.js branch switch main
node dist/index.js branch delete test-branch --yes

# Stash
node dist/index.js stash save "work in progress"
node dist/index.js stash list
node dist/index.js stash pop

# Rebase
node dist/index.js rebase --yes                    # rebase onto upstream
node dist/index.js rebase origin/main --yes

# Reset
node dist/index.js reset --soft                    # confirm prompt always shown
node dist/index.js reset --hard                    # confirm always shown, --yes has no effect

# Cherry-pick
node dist/index.js cherry-pick --from main         # interactive log picker
```
