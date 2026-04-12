import { execSync, spawnSync } from "child_process";
import { FileChange, GitLog, GitStatus } from "./types/index.js";

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

// ── Util ──────────────────────────────────────────────────────────────────────

function run(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch {
    return null;
  }
}
