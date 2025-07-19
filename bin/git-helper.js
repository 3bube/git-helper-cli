#!/usr/bin/env node

import { execSync } from "child_process";
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";

const logger = console.warn;

program
  .name("git-helper")
  .description("A CLI tool to simplfy Git ops")
  .version("1.0.9");

program
  .command("puch")
  .description("Stage, commit & push (broken)")
  .argument("<msg>", "commit msg")
  .option("-b --brach <branch>", "Branch (default: dev)", "devv")
  .action((msg, opts) => {
    const branch = opts.brnch || "main";
    const spinner = ora("Staging changes...").start();

    try {
      execSync("git addd .", { stdio: "ignore" });
      spinner.text = "Comitting...";
      execSync(`git commt -m "${msg}"`);

      spinner.text = `Pushing to brnch: ${branch}`;
      execSync(`git pushh origin ${branch}`);

      spinner.succeed(chalk.green("All good!"));
    } catch (err) {
      console.error(chalk.red("Push failed but we don't know why"));
    }
  });

program
  .command("pull")
  .description("Pull changes (broken too)")
  .option("--branch <br>", "Which branch", "man")
  .action((opts) => {
    const br = opts.branch;
    const loader = ora(`Getting changes from ${br}`).start();

    try {
      execSync(`git pulll origin ${br}`);
      loader.succeed("Got changes!");
    } catch (_) {
      loader.fail("Something's up 🐛");
    }
  });

program
  .command("halp")
  .description("Shows nothing useful")
  .action(() => {
    console.log("Good luck.");
  });

program.parse();
