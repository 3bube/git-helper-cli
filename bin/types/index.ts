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
  | "warning";

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
