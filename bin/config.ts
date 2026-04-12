import fs from "fs";
import { box, c, kv } from "./ui.js";
import { Config, ConfigOptions } from "./types/index.js";
import {
  AVAILABLE_MODELS,
  GLOBAL_CONFIG_FILE,
  PROJECT_CONFIG_FILE,
} from "./constants/index.js";
import { loadConfig, readJsonFile } from "./utils/index.js";

export function runConfigSync(options: ConfigOptions): void {
  if (options.listModels) {
    showModels();
    return;
  }

  if (options.show) {
    showCurrentConfig();
    return;
  }

  if (options.reset) {
    resetProjectConfig();
    return;
  }

  if (options.resetGlobal) {
    resetGlobalConfig();
    return;
  }

  let changed = false;

  if (options.setKey) {
    setProjectValue("apiKey", options.setKey);
    ensureGitIgnored(PROJECT_CONFIG_FILE);
    console.log(`${c.success("✓")} Project API key saved`);
    changed = true;
  }

  if (options.setGlobalKey) {
    setGlobalValue("apiKey", options.setGlobalKey);
    console.log(`${c.success("✓")} Global API key saved`);
    changed = true;
  }

  if (!changed) {
    showCurrentConfig();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showCurrentConfig(): void {
  const config = loadConfig();
  const project = readJsonFile<Partial<Config>>(PROJECT_CONFIG_FILE);
  const global = readJsonFile<Partial<Config>>(GLOBAL_CONFIG_FILE);

  const keySource = process.env["GROQ_API_KEY"]
    ? "env"
    : project?.apiKey
      ? "project"
      : global?.apiKey
        ? "global"
        : "not set";

  const modelSource = project?.model
    ? "project"
    : global?.model
      ? "global"
      : "default";

  const maskedKey = config.apiKey
    ? config.apiKey.slice(0, 7) + "•".repeat(16)
    : "not set";

  box("Current configuration", [
    kv("API key", `${maskedKey}  ${c.muted(`(${keySource})`)}`),
    kv("Model", `${c.primary(config.model)}  ${c.muted(`(${modelSource})`)}`),
    "",
    kv(
      "Project config",
      fs.existsSync(PROJECT_CONFIG_FILE)
        ? c.success("found")
        : c.muted("not found"),
    ),
    kv(
      "Global config",
      fs.existsSync(GLOBAL_CONFIG_FILE)
        ? c.success("found")
        : c.muted("not found"),
    ),
  ]);
}

function showModels(): void {
  const current = loadConfig().model;
  console.log();

  for (const m of AVAILABLE_MODELS) {
    const isActive = m.id === current;
    const marker = isActive ? c.success("●") : c.muted("○");
    const id = isActive ? c.primary(m.id) : c.white.bold(m.id);
    console.log(`  ${marker}  ${id}`);
    console.log(
      `     ${c.muted(m.description.padEnd(28))} ${c.muted(m.speed)}`,
    );
    console.log();
  }
}

function resetProjectConfig(): void {
  if (fs.existsSync(PROJECT_CONFIG_FILE)) {
    fs.unlinkSync(PROJECT_CONFIG_FILE);
    console.log(`${c.success("✓")} Project config reset`);
  } else {
    console.log(`${c.muted("ℹ")} No project config found`);
  }
}

function resetGlobalConfig(): void {
  if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    fs.unlinkSync(GLOBAL_CONFIG_FILE);
    console.log(`${c.success("✓")} Global config reset`);
  } else {
    console.log(`${c.muted("ℹ")} No global config found`);
  }
}

export function setProjectValue(key: keyof Config, value: string): void {
  const existing = readJsonFile<Partial<Config>>(PROJECT_CONFIG_FILE) ?? {};
  existing[key] = value;
  fs.writeFileSync(PROJECT_CONFIG_FILE, JSON.stringify(existing, null, 2));
}

export function setGlobalValue(key: keyof Config, value: string): void {
  const existing = readJsonFile<Partial<Config>>(GLOBAL_CONFIG_FILE) ?? {};
  existing[key] = value;
  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(existing, null, 2));
}

function ensureGitIgnored(filename: string): void {
  const gitignorePath = ".gitignore";
  if (!fs.existsSync(gitignorePath)) return;

  const content = fs.readFileSync(gitignorePath, "utf-8");
  if (!content.includes(filename)) {
    fs.appendFileSync(gitignorePath, `\n${filename}\n`);
  }
}
