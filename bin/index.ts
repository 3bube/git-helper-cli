#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { runStatusCommand } from "./commands/status.js";
import { runPushCommand } from "./commands/push.js";
import { runPullCommand } from "./commands/pull.js";
import { runCommitMsgCommand } from "./commands/commit-msg.js";
import { runConfigCommand } from "./commands/config.js";
import { runBranchCommand } from "./commands/branch.js";
import { runStashCommand } from "./commands/stash.js";
import { runRebaseCommand } from "./commands/rebase.js";
import { runResetCommand } from "./commands/reset.js";
import { runCherryPickCommand } from "./commands/cherry-pick.js";
import { hasGitInstalled } from "./git.js";
import { box, c } from "./ui.js";

function printBanner(): void {
  console.log();
  console.log(
    c.primary("  ◆  ") +
      chalk.bold("git-helper") +
      c.muted("  AI-powered git workflow"),
  );
  console.log();
}

function assertGit(): void {
  if (!hasGitInstalled()) {
    box("Git not found", ["Please install git: https://git-scm.com"], "error");
    process.exit(1);
  }
}

const program = new Command();

program
  .name("git-helper")
  .description("AI-powered git workflow CLI")
  .version("2.0.0")
  .addHelpText("beforeAll", "\n  ◆  git-helper  —  AI-powered git workflow\n")
  .hook("preAction", () => {
    assertGit();
  });

program
  .command("status")
  .alias("s")
  .description("Show a rich git status dashboard")
  .action(async () => {
    await runStatusCommand();
  });

program
  .command("push [message]")
  .description("Stage, commit, and push changes")
  .option("--ai", "generate commit message with AI")
  .option("-b, --branch <branch>", "target branch (defaults to current)")
  .option("--dry-run", "preview without executing")
  .action(
    async (
      message: string | undefined,
      options: { ai: boolean; branch?: string; dryRun: boolean },
    ) => {
      printBanner();
      try {
        await runPushCommand(message, {
          ai: options.ai,
          branch: options.branch,
          dryRun: options.dryRun,
          message,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        box("Error", [msg], "error");
        process.exit(1);
      }
    },
  );

program
  .command("pull")
  .description("Pull latest changes from remote")
  .option("-b, --branch <branch>", "source branch (defaults to current)")
  .action(async (options: { branch?: string }) => {
    printBanner();
    try {
      await runPullCommand({ branch: options.branch });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      box("Error", [msg], "error");
      process.exit(1);
    }
  });

program
  .command("commit-msg")
  .description("Preview AI-generated commit message without committing")
  .action(async () => {
    printBanner();
    await runCommitMsgCommand();
  });

program
  .command("config")
  .description("Manage configuration (API key, model, etc.)")
  .option("--set-key <key>", "set project API key")
  .option("--model", "pick project model interactively")
  .option("--set-global-key <key>", "set global API key")
  .option("--global-model", "pick global model interactively")
  .option("--show", "show current config")
  .option("--list-models", "list all available models")
  .option("--reset", "reset project config")
  .option("--reset-global", "reset global config")
  .action(
    async (options: {
      setKey?: string;
      model?: boolean;
      setGlobalKey?: string;
      globalModel?: boolean;
      show?: boolean;
      listModels?: boolean;
      reset?: boolean;
      resetGlobal?: boolean;
    }) => {
      printBanner();
      await runConfigCommand(options);
    },
  );

program
  .command("branch <subcommand> [name]")
  .description("Manage branches (list, create, switch, delete)")
  .option("--switch", "auto-switch after create")
  .option("--force", "force delete unmerged branch")
  .option("--yes", "skip confirmations")
  .action(async (subcommand: string, name: string | undefined, options: { switch?: boolean; force?: boolean; yes?: boolean }) => {
    printBanner();
    await runBranchCommand(subcommand, name, options);
  });

program
  .command("stash <subcommand> [arg]")
  .description("Manage stashes (save, pop, list, apply)")
  .option("--yes", "skip confirmations")
  .action(async (subcommand: string, arg: string | undefined, options: { yes?: boolean }) => {
    printBanner();
    await runStashCommand(subcommand, arg, options);
  });

program
  .command("rebase [target]")
  .description("Rebase current branch onto target")
  .option("--abort", "abort in-progress rebase")
  .option("--continue", "continue in-progress rebase")
  .option("--yes", "skip confirmation")
  .action(async (target: string | undefined, options: { abort?: boolean; continue?: boolean; yes?: boolean }) => {
    printBanner();
    await runRebaseCommand(target, options);
  });

program
  .command("reset [ref]")
  .description("Reset HEAD to a ref (default: HEAD, mode: mixed)")
  .option("--soft", "keep changes staged")
  .option("--hard", "discard all changes (always confirms)")
  .option("--yes", "skip confirmation (ignored for --hard)")
  .action(async (ref: string | undefined, options: { soft?: boolean; hard?: boolean; yes?: boolean }) => {
    printBanner();
    await runResetCommand(ref, options);
  });

program
  .command("cherry-pick")
  .description("Interactively cherry-pick a commit from another branch")
  .option("--from <branch>", "source branch to pick from")
  .action(async (options: { from?: string }) => {
    printBanner();
    await runCherryPickCommand(options);
  });

// ── Default action (no command = status dashboard) ────────────────────────────
program.action(async () => {
  await runStatusCommand();
});

program.parse(process.argv);
