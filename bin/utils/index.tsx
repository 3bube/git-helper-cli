import { FileStatus, Config } from "../types/index.js";
import { Box as InkBox, Text } from "ink";
import { Groq } from "groq-sdk";
import {
  PROJECT_CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
  DEFAULT_MODEL,
} from "../constants/index.js";
import fs from "fs";

export function toFileStatus(s: string): FileStatus {
  const allowed: FileStatus[] = [
    "modified",
    "added",
    "deleted",
    "renamed",
    "copied",
    "unmerged",
  ];
  return (allowed.includes(s as FileStatus) ? s : "modified") as FileStatus;
}

export function HintLine({
  left,
  right,
}: {
  left: string;
  right: string;
}): React.JSX.Element {
  return (
    <InkBox>
      <Text color="#6B7280">{left}</Text>
      <Text color="#6B7280">{right}</Text>
    </InkBox>
  );
}

export async function generateCommitMessage(
  apiKey: string,
  model: string,
  diff: string,
): Promise<string> {
  const groq = new Groq({ apiKey });
  const truncatedDiff =
    diff.length > 8000 ? diff.slice(0, 8000) + "\n... (truncated)" : diff;

  try {
    const response = await groq.chat.completions.create({
      model,
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a commit message generator. Return ONLY a single conventional commit message — no explanation, no quotes, no markdown.",
        },
        {
          role: "user",
          content: `Generate a commit message for this diff:\n\n${truncatedDiff}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    return raw
      .replace(/\0/g, "")
      .trim()
      .replace(/^["']|["']$/g, "");
  } catch (err) {
    throw err;
  }
}

export const STATUS_ICON: Record<FileStatus, string> = {
  modified: "~",
  added: "+",
  deleted: "-",
  renamed: "→",
  copied: "⎘",
  unmerged: "!",
};

export const STATUS_COLOR: Record<FileStatus, string> = {
  modified: "#FBBF24",
  added: "#4ADE80",
  deleted: "#F87171",
  renamed: "#7C6FF7",
  copied: "#7C6FF7",
  unmerged: "#F87171",
};

// ── Load config (priority: env → project → global → defaults) ─────────────────

export function loadConfig(): Config {
  const project = readJsonFile<Partial<Config>>(PROJECT_CONFIG_FILE);
  const global = readJsonFile<Partial<Config>>(GLOBAL_CONFIG_FILE);

  return {
    apiKey:
      process.env["GROQ_API_KEY"] ?? project?.apiKey ?? global?.apiKey ?? "",
    model: project?.model ?? global?.model ?? DEFAULT_MODEL,
  };
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}
