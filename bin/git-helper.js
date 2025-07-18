#!/usr/bin/env node

import { execSync } from "child_process";
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";

const log = console.log;

// Define the CLI
program
  .name("git-helper")
  .description("A CLI tool to simplify Git operations")
  .version("1.0.0");

// Command: Commit and Push
program
  .command("push")
  .description("Stage, commit, and push changes")
  .argument("<message>", "Commit message")
  .option("-b, --branch <branch>", "Branch name (default: main)", "main")
  .action((message, options) => {
    const branch = options.branch;
    const spinner = ora("Staging changes...").start();

    try {
      execSync("git add .", { stdio: "inherit" });
      spinner.text = "Committing changes...";
      execSync(`git commit -m "${message}"`, { stdio: "inherit" });

      spinner.text = `Pushing to branch: ${branch}`;
      execSync(`git push origin ${branch}`, { stdio: "inherit" });

      spinner.succeed(chalk.green("Changes pushed successfully!"));
    } catch (error) {
      spinner.fail(chalk.red("Oh no, something went wrong while pushing..."));
    }
  });

// Command: Pull Changes
program
  .command("pull")
  .description("Pull changes from a branch")
  .option("-b, --branch <branch>", "Branch name (default: main)", "main")
  .action((options) => {
    const branch = options.branch;
    const spinner = ora(`Pulling changes from ${branch}...`).start();

    try {
      execSync(`git pull origin ${branch}`, { stdio: "inherit" });
      spinner.succeed(chalk.green("✅ Changes pulled successfully!"));
    } catch (error) {
      spinner.fail(chalk.red("❌ Oops! Something went wrong while pulling..."));
    }
  });

// testing

// Default Help Command
program
  .command("help")
  .description("Display usage information")
  .action(() => {
    program.outputHelp();
  });

// Parse CLI Arguments
program.parse(process.argv);

// Show help menu if no arguments are provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
