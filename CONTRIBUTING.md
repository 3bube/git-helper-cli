# Contributing to git-helper-cli

Thanks for taking the time to contribute!

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run the tests: `npm test`

## Making Changes

- Create a new branch for your change: `git checkout -b feat/your-feature`
- Make your changes in `bin/`
- Add or update tests in `test/commands.test.js` for any new behaviour
- Run `npm run build && npm test` to confirm everything passes
- Open a pull request against `main`

## Project Structure

```
bin/
  commands/     # One file per command (push, pull, branch, stash, …)
  components/   # Shared Ink UI components
  git.ts        # All git operations (spawnSync-based, no shell injection)
  index.ts      # CLI entry point (commander)
test/
  commands.test.js   # Integration tests — spawn the real CLI in temp repos
```

## Guidelines

- Use `spawnSync("git", [...args])` arrays in `git.ts`, never template strings passed to a shell
- Every new command needs at least one integration test
- Keep Ink component phases explicit — add new phases to the `Phase` union in `bin/types/index.ts`
- Exit codes: `0` for informational outcomes, `1` for actual failures

## Reporting Issues

Open an issue and include:
- Your OS and Node.js version
- The exact command you ran
- The output you saw vs what you expected
