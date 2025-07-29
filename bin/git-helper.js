#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import Groq from "groq-sdk";

const log = console.log;

// Configuration management
const AVAILABLE_MODELS = {
  "llama-3.3-70b-versatile":
    "Llama 3.3 70B - Best overall performance (Recommended)",
  "llama-3.1-70b-instruct": "Llama 3.1 70B - Great for complex tasks",
  "llama-3.1-8b-instruct": "Llama 3.1 8B - Fast and efficient",
  "deepseek-r1-distill-llama-70b": "DeepSeek R1 70B - Advanced reasoning",
  "deepseek-r1-distill-qwen-32b": "DeepSeek R1 32B - Good reasoning, faster",
  "qwen-2.5-coder-32b": "Qwen Coder 32B - Optimized for code understanding",
  "qwen-2.5-32b": "Qwen 2.5 32B - Well-rounded performance",
  "mixtral-8x7b-32768": "Mixtral 8x7B - Good balance of speed/quality",
  "llama-3.2-90b-text-preview": "Llama 3.2 90B - Large context, preview",
  "llama-3.2-11b-text-preview": "Llama 3.2 11B - Medium size, preview",
  "llama-3.2-3b-preview": "Llama 3.2 3B - Lightweight, preview",
  "llama-3.2-1b-preview": "Llama 3.2 1B - Ultra-fast, preview",
  "gemma2-9b-it": "Gemma2 9B - Google model",
  "qwen-qwq-32b": "Qwen QwQ 32B - Question-answering focused",
  "llama3-70b-8192": "Llama3 70B - Legacy, reliable",
  "llama3-8b-8192": "Llama3 8B - Legacy, fast",
};

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getConfigPath() {
  // Try to find git root directory first
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    return resolve(gitRoot, ".git-helper-config.json");
  } catch {
    // Fallback to current working directory if not in git repo
    return resolve(process.cwd(), ".git-helper-config.json");
  }
}

const CONFIG_FILE = getConfigPath();

function loadConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch (error) {
    log(
      chalk.yellow(`⚠️  Warning: Could not load config file: ${error.message}`)
    );
  }
  return {};
}

function saveConfig(config) {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    // Add to .gitignore if we're in a git repo
    addToGitignore();
    return true;
  } catch (error) {
    log(chalk.red(`❌ Failed to save config: ${error.message}`));
    return false;
  }
}

function addToGitignore() {
  try {
    const gitignorePath = resolve(process.cwd(), ".gitignore");
    const configFileName = ".git-helper-config.json";

    let gitignoreContent = "";
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, "utf8");
    }

    // Check if the config file is already in .gitignore
    if (!gitignoreContent.includes(configFileName)) {
      const newLine =
        gitignoreContent.length > 0 && !gitignoreContent.endsWith("\n")
          ? "\n"
          : "";
      const comment = gitignoreContent.includes("git-helper")
        ? ""
        : "\n# git-helper configuration\n";
      writeFileSync(
        gitignorePath,
        gitignoreContent + newLine + comment + configFileName + "\n"
      );
      log(chalk.gray(`📝 Added ${configFileName} to .gitignore`));
    }
  } catch (error) {
    // Silently fail if we can't update .gitignore
    log(chalk.gray(`⚠️ Could not update .gitignore: ${error.message}`));
  }
}

function getGroqApiKey() {
  // Priority order: environment variable -> config file -> global config -> prompt user
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY;
  }

  // Try project-specific config first
  const config = loadConfig();
  if (config.groqApiKey) {
    return config.groqApiKey;
  }

  // Fallback to global config in home directory
  try {
    const globalConfigPath = resolve(
      require("os").homedir(),
      ".git-helper-global.json"
    );
    if (existsSync(globalConfigPath)) {
      const globalConfig = JSON.parse(readFileSync(globalConfigPath, "utf8"));
      if (globalConfig.groqApiKey) {
        return globalConfig.groqApiKey;
      }
    }
  } catch {
    // Ignore global config errors
  }

  return null;
}

function getSelectedModel() {
  const config = loadConfig();
  if (config.model && AVAILABLE_MODELS[config.model]) {
    return config.model;
  }

  // Try global config
  try {
    const globalConfigPath = resolve(
      require("os").homedir(),
      ".git-helper-global.json"
    );
    if (existsSync(globalConfigPath)) {
      const globalConfig = JSON.parse(readFileSync(globalConfigPath, "utf8"));
      if (globalConfig.model && AVAILABLE_MODELS[globalConfig.model]) {
        return globalConfig.model;
      }
    }
  } catch {
    // Ignore global config errors
  }

  return DEFAULT_MODEL;
}

// Utility functions
function isGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasChangesToCommit() {
  try {
    // Check for any changes (staged, unstaged, or untracked)
    const result = execSync("git status --porcelain", { encoding: "utf8" });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function sanitizeCommitMessage(message) {
  // Escape double quotes and prevent command injection
  return message
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

function executeCommand(command, errorMessage) {
  try {
    execSync(command, { stdio: "pipe" });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr?.toString() || "",
    };
  }
}

// Define the CLI
program
  .name("git-helper")
  .description(
    "A CLI tool to simplify Git operations with AI-powered commit messages"
  )
  .version("1.0.0");

// Command: Configure API key
program
  .command("config")
  .description("Configure git-helper settings")
  .option("--set-key <key>", "Set Groq API key for this project")
  .option("--set-global-key <key>", "Set Groq API key globally")
  .option("--set-model <model>", "Set AI model for this project")
  .option("--set-global-model <model>", "Set AI model globally")
  .option("--list-models", "List all available free AI models")
  .option("--show", "Show current configuration")
  .option("--reset", "Reset project configuration")
  .option("--reset-global", "Reset global configuration")
  .action((options) => {
    if (options.listModels) {
      log(chalk.cyan("🤖 Available Free AI Models:"));
      log("");
      Object.entries(AVAILABLE_MODELS).forEach(([model, description]) => {
        const isDefault = model === DEFAULT_MODEL;
        const prefix = isDefault ? chalk.green("⭐") : "  ";
        log(`${prefix} ${chalk.yellow(model)}`);
        log(`     ${chalk.gray(description)}`);
        log("");
      });
      log(
        chalk.gray("💡 Tip: Use --set-model <model-name> to change the model")
      );
      return;
    }

    if (options.setModel) {
      if (!AVAILABLE_MODELS[options.setModel]) {
        log(chalk.red(`❌ Invalid model: ${options.setModel}`));
        log(chalk.yellow("Use --list-models to see available options"));
        return;
      }
      const config = loadConfig();
      config.model = options.setModel;
      if (saveConfig(config)) {
        log(chalk.green("✅ AI model updated for this project!"));
        log(chalk.gray(`Model: ${options.setModel}`));
        log(chalk.gray(`Description: ${AVAILABLE_MODELS[options.setModel]}`));
      }
    } else if (options.setGlobalModel) {
      if (!AVAILABLE_MODELS[options.setGlobalModel]) {
        log(chalk.red(`❌ Invalid model: ${options.setGlobalModel}`));
        log(chalk.yellow("Use --list-models to see available options"));
        return;
      }
      try {
        const globalConfigPath = resolve(
          require("os").homedir(),
          ".git-helper-global.json"
        );
        const globalConfig = existsSync(globalConfigPath)
          ? JSON.parse(readFileSync(globalConfigPath, "utf8"))
          : {};
        globalConfig.model = options.setGlobalModel;
        writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
        log(chalk.green("✅ AI model updated globally!"));
        log(chalk.gray(`Model: ${options.setGlobalModel}`));
        log(
          chalk.gray(`Description: ${AVAILABLE_MODELS[options.setGlobalModel]}`)
        );
      } catch (error) {
        log(chalk.red(`❌ Failed to save global model: ${error.message}`));
      }
    } else if (options.setKey) {
      const config = loadConfig();
      config.groqApiKey = options.setKey;
      if (saveConfig(config)) {
        log(chalk.green("✅ Groq API key saved for this project!"));
        log(chalk.gray(`Config saved to: ${CONFIG_FILE}`));
      }
    } else if (options.setGlobalKey) {
      try {
        const globalConfigPath = resolve(
          require("os").homedir(),
          ".git-helper-global.json"
        );
        const globalConfig = existsSync(globalConfigPath)
          ? JSON.parse(readFileSync(globalConfigPath, "utf8"))
          : {};
        globalConfig.groqApiKey = options.setGlobalKey;
        writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
        log(chalk.green("✅ Groq API key saved globally!"));
        log(chalk.gray(`Global config: ${globalConfigPath}`));
      } catch (error) {
        log(chalk.red(`❌ Failed to save global config: ${error.message}`));
      }
    } else if (options.show) {
      const config = loadConfig();
      const currentKey = getGroqApiKey();
      const currentModel = getSelectedModel();

      log(chalk.cyan("📋 Current Configuration:"));
      log("");

      // Project settings
      log(chalk.yellow("🏠 Project Settings:"));
      log(chalk.gray(`   Config file: ${CONFIG_FILE}`));
      log(
        chalk.gray(
          `   API key: ${
            config.groqApiKey ? "***" + config.groqApiKey.slice(-4) : "Not set"
          }`
        )
      );
      log(chalk.gray(`   Model: ${config.model || "Not set"}`));
      log("");

      // Global settings
      log(chalk.yellow("🌐 Global Settings:"));
      try {
        const globalConfigPath = resolve(
          require("os").homedir(),
          ".git-helper-global.json"
        );
        const globalConfig = existsSync(globalConfigPath)
          ? JSON.parse(readFileSync(globalConfigPath, "utf8"))
          : {};
        log(
          chalk.gray(
            `   API key: ${
              globalConfig.groqApiKey
                ? "***" + globalConfig.groqApiKey.slice(-4)
                : "Not set"
            }`
          )
        );
        log(chalk.gray(`   Model: ${globalConfig.model || "Not set"}`));
      } catch {
        log(chalk.gray(`   API key: Not set`));
        log(chalk.gray(`   Model: Not set`));
      }
      log("");

      // Environment & active settings
      log(chalk.yellow("🔧 Environment & Currently Active:"));
      log(
        chalk.gray(
          `   Environment API key: ${
            process.env.GROQ_API_KEY ? "Set" : "Not set"
          }`
        )
      );
      log(
        chalk.green(
          `   ✅ Using API key: ${
            currentKey ? "***" + currentKey.slice(-4) : "None"
          }`
        )
      );
      log(chalk.green(`   ✅ Using model: ${currentModel}`));
      log(
        chalk.gray(`   Model description: ${AVAILABLE_MODELS[currentModel]}`)
      );
    } else if (options.reset) {
      if (existsSync(CONFIG_FILE)) {
        try {
          writeFileSync(CONFIG_FILE, "{}");
          log(chalk.green("✅ Project configuration reset!"));
        } catch (error) {
          log(chalk.red(`❌ Failed to reset config: ${error.message}`));
        }
      } else {
        log(chalk.yellow("⚠️  No project configuration file found"));
      }
    } else if (options.resetGlobal) {
      try {
        const globalConfigPath = resolve(
          require("os").homedir(),
          ".git-helper-global.json"
        );
        if (existsSync(globalConfigPath)) {
          writeFileSync(globalConfigPath, "{}");
          log(chalk.green("✅ Global configuration reset!"));
        } else {
          log(chalk.yellow("⚠️  No global configuration file found"));
        }
      } catch (error) {
        log(chalk.red(`❌ Failed to reset global config: ${error.message}`));
      }
    } else {
      log(
        chalk.yellow(
          "Please specify an option. Use --help for more information."
        )
      );
      log("");
      log(chalk.cyan("Quick start:"));
      log(chalk.gray("  1. git-helper config --list-models"));
      log(chalk.gray("  2. git-helper config --set-model <model-name>"));
      log(chalk.gray("  3. git-helper config --set-key <your-groq-api-key>"));
    }
  });

// Command: Commit and Push with optional AI commit message generation
program
  .command("push")
  .description("Stage, commit, and push changes")
  .argument("[message]", "Commit message (optional if using --ai)")
  .option("-b, --branch <branch>", "Branch name (default: current branch)")
  .option("--ai", "Generate commit message using AI based on changes")
  .option("--dry-run", "Show what would be done without executing")
  .action(async (message, options) => {
    // Validation
    if (!isGitRepository()) {
      log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }

    if (!hasChangesToCommit()) {
      log(chalk.yellow("⚠️  No changes to commit"));
      return;
    }

    // Get current branch if not specified
    let branch = options.branch;
    if (!branch) {
      try {
        branch = execSync("git branch --show-current", {
          encoding: "utf8",
        }).trim();
      } catch {
        branch = "main";
      }
    }

    // Generate AI commit message if requested
    if (options.ai && !message) {
      const apiKey = getGroqApiKey();
      if (!apiKey) {
        log(chalk.red("❌ Groq API key not found!"));
        log(chalk.yellow("Set it using one of these methods:"));
        log(
          chalk.gray(
            "  1. git-helper config --set-key YOUR_API_KEY (project-specific)"
          )
        );
        log(
          chalk.gray(
            "  2. git-helper config --set-global-key YOUR_API_KEY (global)"
          )
        );
        log(chalk.gray("  3. export GROQ_API_KEY=YOUR_API_KEY"));
        log(chalk.gray("  4. Get your free key at: https://console.groq.com/"));
        log("");
        log(chalk.cyan("💡 Quick setup:"));
        log(
          chalk.gray(
            "  git-helper config --list-models    # See available models"
          )
        );
        log(chalk.gray("  git-helper config --set-model MODEL_NAME"));
        log(chalk.gray("  git-helper config --set-key YOUR_KEY"));
        process.exit(1);
      }

      const spinner = ora("Generating AI commit message...").start();
      try {
        message = await generateAICommitMessage(apiKey);
        spinner.succeed(chalk.blue(`AI generated message: "${message}"`));
      } catch (error) {
        spinner.fail(chalk.red("Failed to generate AI message"));
        log(chalk.yellow("Please provide a manual commit message"));
        process.exit(1);
      }
    }

    if (!message) {
      log(chalk.red("❌ Commit message is required"));
      process.exit(1);
    }

    const sanitizedMessage = sanitizeCommitMessage(message);

    if (options.dryRun) {
      log(chalk.cyan("Dry run - would execute:"));
      log(`  git add .`);
      log(`  git commit -m "${sanitizedMessage}"`);
      log(`  git push origin ${branch}`);
      return;
    }

    const spinner = ora("Staging changes...").start();

    // Stage changes
    let result = executeCommand("git add .", "Failed to stage changes");
    if (!result.success) {
      spinner.fail(chalk.red(`❌ Failed to stage: ${result.error}`));
      return;
    }

    // Commit changes
    spinner.text = "Committing changes...";
    result = executeCommand(
      `git commit -m "${sanitizedMessage}"`,
      "Failed to commit"
    );
    if (!result.success) {
      spinner.fail(chalk.red(`❌ Failed to commit: ${result.error}`));
      return;
    }

    // Push changes
    spinner.text = `Pushing to branch: ${branch}`;
    result = executeCommand(`git push origin ${branch}`, "Failed to push");
    if (!result.success) {
      spinner.fail(chalk.red(`❌ Failed to push: ${result.error}`));
      return;
    }

    spinner.succeed(chalk.green("✅ Changes pushed successfully!"));
  });

// Command: Pull Changes
program
  .command("pull")
  .description("Pull changes from a branch")
  .option("-b, --branch <branch>", "Branch name (default: current branch)")
  .action((options) => {
    if (!isGitRepository()) {
      log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }

    let branch = options.branch;
    if (!branch) {
      try {
        branch = execSync("git branch --show-current", {
          encoding: "utf8",
        }).trim();
      } catch {
        branch = "main";
      }
    }

    const spinner = ora(`Pulling changes from ${branch}...`).start();

    const result = executeCommand(
      `git pull origin ${branch}`,
      "Failed to pull"
    );
    if (!result.success) {
      spinner.fail(chalk.red(`❌ Failed to pull: ${result.error}`));
      return;
    }

    spinner.succeed(chalk.green("✅ Changes pulled successfully!"));
  });

// Command: Generate AI commit message
program
  .command("commit-msg")
  .description("Generate an AI-powered commit message based on changes")
  .option("--staged", "Only analyze staged changes")
  .action(async (options) => {
    if (!isGitRepository()) {
      log(chalk.red("❌ Not a git repository"));
      process.exit(1);
    }

    if (!hasChangesToCommit()) {
      log(chalk.yellow("⚠️  No changes found to analyze"));
      log(chalk.gray("Make some changes to your files first"));
      return;
    }

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      log(chalk.red("❌ Groq API key not found!"));
      log(
        chalk.yellow("Set it using: git-helper config --set-key YOUR_API_KEY")
      );
      process.exit(1);
    }

    const spinner = ora(
      "Analyzing changes and generating commit message..."
    ).start();
    try {
      const message = await generateAICommitMessage(apiKey);
      spinner.succeed(chalk.green("Generated commit message:"));
      log(chalk.cyan(`"${message}"`));
      log("");
      log(chalk.gray("💡 Use this message with:"));
      log(chalk.gray(`   git-helper push "${message}"`));
      log(chalk.gray("   or"));
      log(chalk.gray("   git-helper push --ai"));
    } catch (error) {
      spinner.fail(
        chalk.red(`❌ Failed to generate message: ${error.message}`)
      );

      // Provide helpful suggestions based on error
      if (error.message.includes("untracked files")) {
        log(chalk.yellow("💡 Try: git add . (to stage all changes)"));
      } else if (error.message.includes("No changes found")) {
        log(chalk.yellow("💡 Make some changes to your files first"));
      }
    }
  });

// AI commit message generation function
async function generateAICommitMessage(apiKey) {
  try {
    // First check if there are any changes at all
    const allChanges = execSync("git status --porcelain", { encoding: "utf8" });
    if (!allChanges.trim()) {
      throw new Error("No changes found in repository");
    }

    // Check for staged changes first
    let diff = execSync("git diff --cached --no-color", { encoding: "utf8" });
    let status = execSync("git diff --name-status --cached", {
      encoding: "utf8",
    });

    // If no staged changes, check unstaged changes
    if (!diff.trim()) {
      diff = execSync("git diff --no-color", { encoding: "utf8" });
      status = execSync("git diff --name-status", { encoding: "utf8" });

      if (!diff.trim()) {
        // Check for untracked files
        const untrackedFiles = execSync(
          "git ls-files --others --exclude-standard",
          { encoding: "utf8" }
        );
        if (untrackedFiles.trim()) {
          throw new Error(
            "Found untracked files. Please stage your changes first with 'git add .'"
          );
        } else {
          throw new Error("No changes found to analyze");
        }
      }
    }

    const selectedModel = getSelectedModel();

    // Initialize Groq client
    const groq = new Groq({
      apiKey: apiKey,
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a Git commit message generator. Analyze the provided git diff and file status to create a concise, conventional commit message following this format:

<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Keep it under 50 characters for the first line.
Focus on WHAT changed and WHY, not HOW.

Examples:
- feat(auth): add user login functionality
- fix(api): resolve null pointer in user service
- docs(readme): update installation instructions
- refactor(utils): simplify date formatting logic

Be specific but concise.`,
        },
        {
          role: "user",
          content: `File status:\n${status}\n\nGit diff:\n${diff.slice(
            0,
            4000
          )}`, // Limit diff size
        },
      ],
      model: selectedModel,
      max_tokens: 100,
      temperature: 0.3,
    });

    const message = chatCompletion.choices[0]?.message?.content?.trim();
    if (!message) {
      throw new Error("No response from AI model");
    }

    return message;
  } catch (error) {
    // Handle specific Groq SDK errors
    if (error.error?.type === "invalid_request_error") {
      throw new Error(`Invalid request: ${error.error.message}`);
    } else if (error.error?.type === "authentication_error") {
      throw new Error(`Authentication failed: Check your API key`);
    } else if (error.error?.type === "rate_limit_error") {
      throw new Error(`Rate limit exceeded: Please try again later`);
    } else if (error.error?.type === "api_error") {
      throw new Error(`Groq API error: ${error.error.message}`);
    } else {
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}

// Parse CLI Arguments
program.parse(process.argv);

// Show help menu if no arguments are provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
