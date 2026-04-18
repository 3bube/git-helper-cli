export type FileStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "unmerged";

export type Phase =
  | "validating"
  | "generating"
  | "streaming"
  | "done"
  | "error"
  | "warning"
  | "checking"
  | "resetting"
  | "confirm"
  | "confirm-abort"
  | "rebasing"
  | "done"
  | "conflict"
  | "error"
  | "warning"
  | "staging"
  | "generating-ai"
  | "streaming"
  | "committing"
  | "pushing"
  | "done"
  | "error"
  | "dry-run"
  | "no-message"
  | "no-api-key"
  | "nothing-to-commit"
  | "behind"
  | "no-remote";

export type Mode = "soft" | "mixed" | "hard";

export interface Config {
  apiKey: string;
  model: string;
}

export interface ConfigOptions {
  setKey?: string;
  model?: boolean;
  setGlobalKey?: string;
  globalModel?: boolean;
  show?: boolean;
  listModels?: boolean;
  reset?: boolean;
  resetGlobal?: boolean;
}

export interface GitStatus {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  isRepo: boolean;
}

export interface FileChange {
  status: string;
  file: string;
}

export interface GitLog {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface Branch {
  name: string;
  current: boolean;
  upstream: string | null;
  merged: boolean;
}

export interface StashEntry {
  index: number;
  message: string;
  date: string;
}

export interface RebaseOptions {
  abort?: boolean;
  continue?: boolean;
  yes?: boolean;
}

export interface PushOptions {
  ai: boolean;
  branch?: string | undefined;
  dryRun: boolean;
  message?: string | undefined;
}

export interface ResetOptions {
  soft?: boolean;
  hard?: boolean;
  yes?: boolean;
}

export interface StashOptions {
  yes?: boolean;
}
