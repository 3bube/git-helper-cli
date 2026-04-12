import path from "path";
import os from "os";
import { Phase } from "../types/index.js";

export const AVAILABLE_MODELS: Array<{
  id: string;
  description: string;
  speed: string;
}> = [
  {
    id: "llama-3.3-70b-versatile",
    description: "Best overall",
    speed: "Fast",
  },
  {
    id: "llama-3.1-8b-instant",
    description: "Ultra-fast, lightweight",
    speed: "Ultra-fast",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    description: "Llama 4 Scout — latest Meta",
    speed: "Fast",
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    description: "Kimi K2 — 131k context",
    speed: "Medium",
  },
  {
    id: "moonshotai/kimi-k2-instruct-0905",
    description: "Kimi K2 v0905 — 262k context",
    speed: "Medium",
  },
  {
    id: "openai/gpt-oss-20b",
    description: "OpenAI OSS 20B",
    speed: "Fast",
  },
  {
    id: "openai/gpt-oss-120b",
    description: "OpenAI OSS 120B — most capable",
    speed: "Medium",
  },
  {
    id: "groq/compound-mini",
    description: "Groq Compound Mini",
    speed: "Fast",
  },
  {
    id: "groq/compound",
    description: "Groq Compound",
    speed: "Medium",
  },
  {
    id: "qwen/qwen3-32b",
    description: "Qwen 3 32B",
    speed: "Medium",
  },
];

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const PROJECT_CONFIG_FILE = ".git-helper-config.json";
export const GLOBAL_CONFIG_FILE = path.join(
  os.homedir(),
  ".git-helper-global.json",
);

export const PHASE_LABEL: Partial<Record<Phase, string>> = {
  staging: "Staging changes…",
  "generating-ai": "",
  committing: "Committing…",
  pushing: "",
};
