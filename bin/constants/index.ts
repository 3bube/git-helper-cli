import path from "path";
import os from "os";
import { Phase } from "../types/index.js";

export const AVAILABLE_MODELS: Array<{
  id: string;
  description: string;
  speed: string;
}> = [
  {
    id: "openai/gpt-oss-120b",
    description: "Most capable — reasoning, tools & coding",
    speed: "Very fast",
  },
  {
    id: "openai/gpt-oss-20b",
    description: "Fast, lightweight reasoning model",
    speed: "Ultra-fast",
  },
  {
    id: "qwen/qwen3.6-27b",
    description: "Qwen 3.6 27B — strong general-purpose model",
    speed: "Very fast",
  },
  {
    id: "groq/compound",
    description: "Agentic AI with web search & code execution",
    speed: "Fast",
  },
  {
    id: "groq/compound-mini",
    description: "Lightweight agentic AI with built-in tools",
    speed: "Fast",
  },
  {
    id: "minimaxai/minimax-m2.7",
    description: "MiniMax M2.7 — advanced reasoning & coding",
    speed: "Fast",
  },
  {
    id: "openai/gpt-oss-safeguard-20b",
    description: "GPT-OSS 20B optimized for safety classification",
    speed: "Ultra-fast",
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
