# git-helper-cli

An AI-powered Git workflow CLI built with Ink/React for beautiful terminal UI. Combines everyday Git operations with Groq-powered commit message generation.

## Features

- **AI commit messages** — generates conventional commit messages from your diff using Groq
- **Interactive model picker** — browse and select from 10 free Groq models in-terminal
- **Branch management** — list, create, switch, and delete branches with safety checks
- **Stash management** — save, pop, list, and apply stashes interactively
- **Rebase** — rebase with conflict detection, abort, and continue support
- **Reset** — soft/mixed/hard reset with confirmation and file previews
- **Cherry-pick** — interactive branch and commit picker
- **Safe by default** — dangerous operations always confirm before executing

## Installation

```bash
npm install -g git-helper-cli
```

## Quick Setup

**1. Add your Groq API key** (free at [console.groq.com](https://console.groq.com))

```bash
git-helper config --set-key gsk_your_key_here
```

**2. Pick an AI model**

```bash
git-helper config --model
```

This opens an interactive picker — use arrow keys to browse, Enter to select.

**3. Start using it**

```bash
git-helper commit-msg
git-helper push --ai
```

---

## Commands

### `status` (default)

Show a rich git status dashboard — branch info, staged/unstaged files, recent commits.

```bash
git-helper
git-helper status
```

---

### `push [message]`

Stage all changes, commit, and push.

```bash
# AI-generated commit message
git-helper push --ai

# Manual commit message
git-helper push "feat(auth): add OAuth integration"

# Target a specific branch
git-helper push --ai --branch feature/my-branch

# Preview without executing
git-helper push --ai --dry-run
```

---

### `commit-msg`

Preview an AI-generated commit message without committing anything.

```bash
git-helper commit-msg
```

---

### `pull`

Pull latest changes from the remote.

```bash
git-helper pull
git-helper pull --branch main
```

---

### `branch <subcommand> [name]`

Manage branches.

```bash
# List all branches
git-helper branch list

# Create a new branch
git-helper branch create my-feature

# Create and immediately switch
git-helper branch create my-feature --switch

# Switch branches (interactive picker if name omitted)
git-helper branch switch
git-helper branch switch main

# Delete a branch
git-helper branch delete old-branch           # only if merged
git-helper branch delete old-branch --force   # force delete unmerged
git-helper branch delete old-branch --yes     # skip confirmation
```

---

### `stash <subcommand>`

Manage stashes.

```bash
# Stash current changes (includes untracked files)
git-helper stash save
git-helper stash save "work in progress"

# Apply and remove the top stash
git-helper stash pop

# List all stashes
git-helper stash list

# Apply a specific stash by index (keeps it in the list)
git-helper stash apply 0
git-helper stash apply 0 --yes   # skip confirmation
```

---

### `rebase [target]`

Rebase the current branch.

```bash
# Rebase onto upstream (e.g. origin/main)
git-helper rebase

# Rebase onto a specific target
git-helper rebase origin/main

# Skip confirmation
git-helper rebase origin/main --yes

# Continue or abort an in-progress rebase
git-helper rebase --continue
git-helper rebase --abort
```

Conflicts are detected automatically — the tool shows which files need resolution and tells you what to run next.

---

### `reset [ref]`

Reset HEAD to a commit reference.

```bash
# Uncommit last commit, keep changes staged
git-helper reset --soft

# Uncommit last commit, keep changes unstaged (default)
git-helper reset

# Discard all changes permanently (always confirms, --yes has no effect)
git-helper reset --hard

# Reset to a specific ref
git-helper reset HEAD~2 --soft
git-helper reset abc1234
```

| Mode      | Changes               | Safe to skip confirm? |
| --------- | --------------------- | --------------------- |
| `--soft`  | Stay staged           | Yes (`--yes`)         |
| `--mixed` | Become unstaged       | Yes (`--yes`)         |
| `--hard`  | Permanently discarded | Never                 |

---

### `cherry-pick`

Interactively cherry-pick a commit from another branch.

```bash
# Pick source branch interactively, then pick commit
git-helper cherry-pick

# Go straight to the commit picker for a branch
git-helper cherry-pick --from feature/my-branch
```

Shows the last 20 commits from the source branch with a diff preview before confirming.

---

### `config`

Manage API keys and model selection.

```bash
# Set project API key (auto-added to .gitignore)
git-helper config --set-key gsk_your_key

# Set global API key (fallback for all repos)
git-helper config --set-global-key gsk_your_key

# Interactive model picker (project-scoped)
git-helper config --model

# Interactive model picker (global)
git-helper config --global-model

# Show current config
git-helper config --show

# List all available models
git-helper config --list-models

# Reset configs
git-helper config --reset          # project config
git-helper config --reset-global   # global config
```

---

## Available Models

All models are free via Groq. Select interactively with `git-helper config --model`.

| Model                                       | Description             | Speed      |
| ------------------------------------------- | ----------------------- | ---------- |
| `llama-3.3-70b-versatile` ⭐                | Best overall            | Fast       |
| `llama-3.1-8b-instant`                      | Ultra-fast, lightweight | Ultra-fast |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Latest Meta Llama 4     | Fast       |
| `moonshotai/kimi-k2-instruct`               | 131k context window     | Medium     |
| `moonshotai/kimi-k2-instruct-0905`          | 262k context window     | Medium     |
| `openai/gpt-oss-20b`                        | OpenAI OSS 20B          | Fast       |
| `openai/gpt-oss-120b`                       | Most capable            | Medium     |
| `groq/compound-mini`                        | Groq Compound Mini      | Fast       |
| `groq/compound`                             | Groq Compound           | Medium     |
| `qwen/qwen3-32b`                            | Qwen 3 32B              | Medium     |

_⭐ Default_

---

## Configuration Priority

1. `GROQ_API_KEY` environment variable
2. Project config (`.git-helper-config.json` in current directory)
3. Global config (`~/.git-helper-global.json`)

Project config is automatically added to `.gitignore` when you set a key with `--set-key`.

---

## Development

```bash
git clone https://github.com/your-username/git-helper-cli
cd git-helper-cli
npm install
npm run build
npm link
```

```bash
# Run without building
npm start -- push --ai
npm start -- branch list
```

---

## Tech Stack

- [Ink](https://github.com/vadimdemedes/ink) — React for terminal UIs
- [Commander.js](https://github.com/tj/commander.js) — CLI argument parsing
- [Groq SDK](https://github.com/groq/groq-typescript) — AI model inference
- [TypeScript](https://www.typescriptlang.org/) — strict mode, ESM, NodeNext

---

## License

MIT
