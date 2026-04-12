import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { FileChange, GitLog, GitStatus, Branch, StashEntry } from "./types/index.js";

function spawn(args: string[]): { stdout: string; stderr: string; ok: boolean } {
  const result = spawnSync("git", args, { stdio: "pipe" });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    ok: result.status === 0,
  };
}

// ── Guards ────────────────────────────────────────────────────────────────────

export function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function hasGitInstalled(): boolean {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ── Status ────────────────────────────────────────────────────────────────────

export function getGitStatus(): GitStatus {
  if (!isGitRepo()) {
    return {
      branch: "",
      upstream: null,
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      isRepo: false,
    };
  }

  const branch = run("git rev-parse --abbrev-ref HEAD") ?? "HEAD";
  const upstream = getUpstream(branch);
  const { ahead, behind } = getAheadBehind(branch, upstream);
  const { staged, unstaged, untracked } = parseStatus();

  return {
    branch,
    upstream,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
    isRepo: true,
  };
}

function getUpstream(branch: string): string | null {
  try {
    const remote = execSync(`git config branch.${branch}.remote`, {
      stdio: "pipe",
    })
      .toString()
      .trim();
    const merge = execSync(`git config branch.${branch}.merge`, {
      stdio: "pipe",
    })
      .toString()
      .trim()
      .replace("refs/heads/", "");
    return `${remote}/${merge}`;
  } catch {
    return null;
  }
}

function getAheadBehind(
  branch: string,
  upstream: string | null,
): { ahead: number; behind: number } {
  if (!upstream) return { ahead: 0, behind: 0 };
  try {
    const result = run(
      `git rev-list --left-right --count ${upstream}...${branch}`,
    );
    if (!result) return { ahead: 0, behind: 0 };
    const [behindStr, aheadStr] = result.split("\t");
    return {
      ahead: parseInt(aheadStr ?? "0", 10),
      behind: parseInt(behindStr ?? "0", 10),
    };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

function parseStatus(): {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
} {
  const output = run("git status --porcelain=v1") ?? "";
  const staged: FileChange[] = [];
  const unstaged: FileChange[] = [];
  const untracked: string[] = [];

  for (const line of output.split("\n").filter(Boolean)) {
    const xy = line.slice(0, 2);
    const file = line.slice(3).trim();
    const x = xy[0]; // index (staged)
    const y = xy[1]; // worktree (unstaged)

    if (x !== " " && x !== "?" && x !== undefined) {
      staged.push({ status: expandStatus(x), file });
    }
    if (y !== " " && y !== "?" && y !== undefined) {
      unstaged.push({ status: expandStatus(y), file });
    }
    if (xy === "??") {
      untracked.push(file);
    }
  }

  return { staged, unstaged, untracked };
}

function expandStatus(code: string): string {
  const map: Record<string, string> = {
    M: "modified",
    A: "added",
    D: "deleted",
    R: "renamed",
    C: "copied",
    U: "unmerged",
  };
  return map[code] ?? code;
}

// ── Log ───────────────────────────────────────────────────────────────────────

export function getRecentLog(count = 5): GitLog[] {
  const output =
    run(`git log --oneline -${count} --format="%H|%h|%an|%ar|%s"`) ?? "";
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, author, date, ...msgParts] = line.split("|");
      return {
        hash: hash ?? "",
        shortHash: shortHash ?? "",
        author: author ?? "",
        date: date ?? "",
        message: msgParts.join("|"),
      };
    });
}

// ── Diff ──────────────────────────────────────────────────────────────────────

export function getDiff(staged = true): string {
  const flag = staged ? "--cached" : "";
  return run(`git diff ${flag} --stat`) ?? "";
}

export function getDiffContent(staged = true): string {
  const flag = staged ? "--cached" : "";
  return run(`git diff ${flag}`) ?? "";
}

// ── Operations ────────────────────────────────────────────────────────────────

export function getCurrentBranch(): string {
  return run("git rev-parse --abbrev-ref HEAD") ?? "main";
}

export function stageAll(): void {
  execSync("git add .", { stdio: "pipe" });
}

export function commit(message: string): void {
  // Sanitize: prevent shell injection via the message
  const safe = message
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
  execSync(`git commit -m "${safe}"`, { stdio: "pipe" });
}

export function push(branch: string): void {
  const result = spawnSync("git", ["push", "origin", branch], {
    stdio: "pipe",
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    throw new Error(stderr || "Push failed");
  }
}

export function pull(branch: string): void {
  const result = spawnSync("git", ["pull", "origin", branch], {
    stdio: "pipe",
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    throw new Error(stderr || "Pull failed");
  }
}

// ── Branch ────────────────────────────────────────────────────────────────────

export function getBranches(): Branch[] {
  const output = run("git branch -vv") ?? "";
  const mergedOutput = run("git branch --merged HEAD") ?? "";
  const mergedNames = new Set(
    mergedOutput.split("\n").map((l) => l.replace(/^\*?\s+/, "").trim()).filter(Boolean),
  );

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const current = line.startsWith("*");
      const rest = line.replace(/^\*?\s+/, "");
      const namePart = rest.split(/\s+/)[0] ?? "";
      const upstreamMatch = rest.match(/\[([^\]]+)\]/);
      const upstream = upstreamMatch ? (upstreamMatch[1] ?? null) : null;
      return {
        name: namePart,
        current,
        upstream,
        merged: mergedNames.has(namePart) && !current,
      };
    });
}

export function createBranch(name: string): void {
  const r = spawn(["branch", name]);
  if (!r.ok) throw new Error(r.stderr.trim() || `Failed to create branch ${name}`);
}

export function switchBranch(name: string): void {
  const r = spawn(["checkout", name]);
  if (!r.ok) throw new Error(r.stderr.trim() || `Failed to switch to ${name}`);
}

export function deleteBranch(name: string, force: boolean): void {
  const r = spawn(["branch", force ? "-D" : "-d", name]);
  if (!r.ok) throw new Error(r.stderr.trim() || `Failed to delete ${name}`);
}

export function isBranchMerged(name: string): boolean {
  const merged = run("git branch --merged HEAD") ?? "";
  return merged.split("\n").some((l) => l.replace(/^\*?\s+/, "").trim() === name);
}

export function hasUncommittedChanges(): boolean {
  const output = run("git status --porcelain=v1") ?? "";
  return output.trim().length > 0;
}

// ── Stash ─────────────────────────────────────────────────────────────────────

export function stashSave(message?: string): void {
  const args = ["stash", "push", "-u"];
  if (message) args.push("-m", message);
  const r = spawn(args);
  if (!r.ok) throw new Error(r.stderr.trim() || "Stash failed");
}

export function stashPop(): string[] {
  const r = spawn(["stash", "pop"]);
  if (!r.ok) {
    if (r.stderr.includes("CONFLICT") || r.stdout.includes("CONFLICT")) {
      return getConflictedFiles();
    }
    throw new Error(r.stderr.trim() || "Stash pop failed");
  }
  return [];
}

export function stashApply(index: number): string[] {
  const r = spawn(["stash", "apply", `stash@{${index}}`]);
  if (!r.ok) {
    if (r.stderr.includes("CONFLICT") || r.stdout.includes("CONFLICT")) {
      return getConflictedFiles();
    }
    throw new Error(r.stderr.trim() || "Stash apply failed");
  }
  return [];
}

export function stashList(): StashEntry[] {
  const output = run('git stash list --format=%gd|%gs|%ci') ?? "";
  return output
    .split("\n")
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split("|");
      const msg = parts[1] ?? parts[0] ?? "";
      const date = parts[2]?.slice(0, 10) ?? "";
      return { index: i, message: msg.replace(/^On \S+: /, ""), date };
    });
}

// ── Rebase ────────────────────────────────────────────────────────────────────

export function rebase(target: string): string[] {
  const r = spawn(["rebase", target]);
  if (!r.ok) {
    if (r.stdout.includes("CONFLICT") || r.stderr.includes("CONFLICT")) {
      return getConflictedFiles();
    }
    throw new Error(r.stderr.trim() || r.stdout.trim() || "Rebase failed");
  }
  return [];
}

export function rebaseAbort(): void {
  execSync("git rebase --abort", { stdio: "pipe" });
}

export function rebaseContinue(): void {
  const r = spawn(["rebase", "--continue"]);
  if (!r.ok) throw new Error(r.stderr.trim() || "Rebase continue failed");
}

export function isRebasing(): boolean {
  const gitDir = run("git rev-parse --git-dir");
  if (!gitDir) return false;
  return (
    fs.existsSync(path.join(gitDir, "rebase-merge")) ||
    fs.existsSync(path.join(gitDir, "rebase-apply"))
  );
}

export function getCommitCount(base: string): number {
  const r = spawn(["rev-list", "--count", `${base}..HEAD`]);
  return parseInt(r.stdout.trim(), 10) || 0;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export function reset(ref: string, mode: "soft" | "mixed" | "hard"): void {
  const r = spawn(["reset", `--${mode}`, ref]);
  if (!r.ok) throw new Error(r.stderr.trim() || "Reset failed");
}

export function getAffectedFiles(ref: string): string[] {
  const r = spawn(["diff", "--name-only", ref]);
  return r.stdout.split("\n").filter(Boolean);
}

// ── Cherry-pick ───────────────────────────────────────────────────────────────

export function cherryPick(hash: string): string[] {
  const r = spawn(["cherry-pick", hash]);
  if (!r.ok) {
    if (r.stdout.includes("CONFLICT") || r.stderr.includes("CONFLICT")) {
      return getConflictedFiles();
    }
    throw new Error(r.stderr.trim() || r.stdout.trim() || "Cherry-pick failed");
  }
  return [];
}

export function getLogFrom(branch: string, count: number): GitLog[] {
  const r = spawn(["log", branch, `--oneline`, `-${count}`, "--format=%H|%h|%an|%ar|%s"]);
  return r.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, author, date, ...msgParts] = line.split("|");
      return {
        hash: hash ?? "",
        shortHash: shortHash ?? "",
        author: author ?? "",
        date: date ?? "",
        message: msgParts.join("|"),
      };
    });
}

// ── Conflict helper ───────────────────────────────────────────────────────────

function getConflictedFiles(): string[] {
  const r = spawn(["diff", "--name-only", "--diff-filter=U"]);
  return r.stdout.split("\n").filter(Boolean);
}

// ── Util ──────────────────────────────────────────────────────────────────────

function run(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch {
    return null;
  }
}
