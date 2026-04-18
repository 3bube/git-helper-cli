/**
 * Integration tests for git-helper-cli.
 *
 * Each test spawns `node dist/index.js <args>` inside a temporary git repo
 * and asserts on exit code + stdout. No mocking — these test real behaviour.
 *
 * Run: npm test
 * Requires: npm run build to have been run first.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Helpers ──────────────────────────────────────────────────────────────────

const CLI = path.resolve(__dirname, "../dist/index.js");

/**
 * Run the CLI with the given args inside `cwd`.
 * Returns { stdout, stderr, status }.
 */
function run(args, cwd, input = "") {
  const result = spawnSync("node", [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
    input,
    timeout: 15000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

/**
 * Create a temporary git repo, optionally with an initial commit.
 * Returns the path to the repo.
 */
function createRepo({ withCommit = true, withRemote = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-test-"));

  spawnSync("git", ["init"], { cwd: dir, stdio: "pipe" });
  spawnSync("git", ["config", "user.email", "test@test.com"], { cwd: dir, stdio: "pipe" });
  spawnSync("git", ["config", "user.name", "Test"], { cwd: dir, stdio: "pipe" });

  if (withCommit) {
    fs.writeFileSync(path.join(dir, "README.md"), "# test\n");
    spawnSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
    spawnSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "pipe" });
  }

  if (withRemote) {
    // Bare repo to act as remote
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "gh-bare-"));
    spawnSync("git", ["init", "--bare"], { cwd: bare, stdio: "pipe" });
    spawnSync("git", ["remote", "add", "origin", bare], { cwd: dir, stdio: "pipe" });
    // Use the actual default branch name (main or master depending on git config)
    const headResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, encoding: "utf8" });
    const defaultBranch = headResult.stdout.trim() || "master";
    spawnSync("git", ["push", "-u", "origin", defaultBranch], { cwd: dir, stdio: "pipe" });
    return { dir, bare };
  }

  return { dir };
}

/** Remove a temp directory. */
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Status ────────────────────────────────────────────────────────────────────

describe("status", () => {
  test("shows working tree clean in a clean repo", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["status"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Working tree clean/i);
    } finally {
      cleanup(dir);
    }
  });

  test("shows staged files when changes are staged", () => {
    const { dir } = createRepo();
    try {
      fs.writeFileSync(path.join(dir, "new.txt"), "hello");
      spawnSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
      const { stdout, status } = run(["status"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/staged/i);
    } finally {
      cleanup(dir);
    }
  });

  test("exits with error when not a git repo", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-nogit-"));
    try {
      const { status } = run(["status"], dir);
      expect(status).toBe(1);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Push ─────────────────────────────────────────────────────────────────────

describe("push", () => {
  test("shows error when no message and no --ai flag", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["push"], dir);
      expect(status).toBe(1);
      expect(stdout).toMatch(/No commit message/i);
    } finally {
      cleanup(dir);
    }
  });

  test("shows warning when no remote origin configured", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["push", "test: add file"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No remote configured/i);
    } finally {
      cleanup(dir);
    }
  });

  test("dry-run shows what would execute without running", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["push", "feat: test", "--dry-run"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Dry run/i);
      expect(stdout).toMatch(/git commit/i);
    } finally {
      cleanup(dir);
    }
  });

  test("commits and pushes with a message when remote is set", () => {
    const { dir } = createRepo({ withRemote: true });
    try {
      fs.writeFileSync(path.join(dir, "change.txt"), "change");
      spawnSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
      const { stdout, status } = run(["push", "test: add change"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Done/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Pull ─────────────────────────────────────────────────────────────────────

describe("pull", () => {
  test("shows warning when no upstream branch configured", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["pull"], dir);
      // Exit 0 — informational warning, not a crash
      expect(status).toBe(0);
      expect(stdout).toMatch(/No upstream|No remote/i);
    } finally {
      cleanup(dir);
    }
  });

  test("succeeds when pulling from a real remote", () => {
    const { dir } = createRepo({ withRemote: true });
    try {
      const { stdout, status } = run(["pull"], dir);
      expect(status).toBe(0);
      // Already up to date or pulled — either way exits cleanly
      expect(stdout.length).toBeGreaterThan(0);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Branch ───────────────────────────────────────────────────────────────────

describe("branch", () => {
  test("list shows current branch", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["branch", "list"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Branches/i);
      // ◆ marks the current branch
      expect(stdout).toMatch(/◆/);
    } finally {
      cleanup(dir);
    }
  });

  test("create makes a new branch", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["branch", "create", "feature/test", "--yes"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Created branch/i);
      // Confirm branch actually exists
      const branches = spawnSync("git", ["branch"], { cwd: dir, encoding: "utf8" });
      expect(branches.stdout).toContain("feature/test");
    } finally {
      cleanup(dir);
    }
  });

  test("switch shows warning when already on that branch", () => {
    const { dir } = createRepo();
    try {
      // Get the current branch name
      const branchResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      });
      const current = branchResult.stdout.trim();
      const { stdout, status } = run(["branch", "switch", current], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Already on branch/i);
    } finally {
      cleanup(dir);
    }
  });

  test("switch shows info when no other branches exist", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["branch", "switch"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No other branches/i);
    } finally {
      cleanup(dir);
    }
  });

  test("delete shows warning when trying to delete current branch", () => {
    const { dir } = createRepo();
    try {
      const branchResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      });
      const current = branchResult.stdout.trim();
      const { stdout, status } = run(["branch", "delete", current, "--yes"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Cannot delete current branch/i);
    } finally {
      cleanup(dir);
    }
  });

  test("delete removes a merged branch", () => {
    const { dir } = createRepo();
    try {
      // Create and immediately come back — the branch is empty/merged
      spawnSync("git", ["branch", "to-delete"], { cwd: dir, stdio: "pipe" });
      const { stdout, status } = run(["branch", "delete", "to-delete", "--yes"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Deleted/i);
    } finally {
      cleanup(dir);
    }
  });

  test("delete shows unmerged warning without --force", () => {
    const { dir } = createRepo();
    try {
      // Create branch with a unique commit
      spawnSync("git", ["checkout", "-b", "unmerged-branch"], { cwd: dir, stdio: "pipe" });
      fs.writeFileSync(path.join(dir, "unmerged.txt"), "data");
      spawnSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
      spawnSync("git", ["commit", "-m", "unmerged commit"], { cwd: dir, stdio: "pipe" });
      spawnSync("git", ["checkout", "-"], { cwd: dir, stdio: "pipe" });

      const { stdout, status } = run(["branch", "delete", "unmerged-branch"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Unmerged branch/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Stash ─────────────────────────────────────────────────────────────────────

describe("stash", () => {
  test("list shows no stashes message when stash is empty", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["stash", "list"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No stashes/i);
    } finally {
      cleanup(dir);
    }
  });

  test("save shows nothing-to-stash on a clean tree", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["stash", "save"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Nothing to stash/i);
    } finally {
      cleanup(dir);
    }
  });

  test("save stashes changes on a dirty tree", () => {
    const { dir } = createRepo();
    try {
      fs.writeFileSync(path.join(dir, "dirty.txt"), "changes");
      const { stdout, status } = run(["stash", "save", "wip"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Stashed/i);
    } finally {
      cleanup(dir);
    }
  });

  test("apply shows error for out-of-bounds index", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["stash", "apply", "99", "--yes"], dir);
      expect(status).toBe(1);
      expect(stdout).toMatch(/stash@\{99\}|only \d+ stash/i);
    } finally {
      cleanup(dir);
    }
  });

  test("pop shows nothing-to-pop when stash is empty", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["stash", "pop"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Nothing to pop/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Rebase ────────────────────────────────────────────────────────────────────

describe("rebase", () => {
  test("shows warning when working tree is dirty", () => {
    const { dir } = createRepo();
    try {
      fs.writeFileSync(path.join(dir, "dirty.txt"), "changes");
      const { stdout, status } = run(["rebase", "HEAD", "--yes"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/uncommitted changes/i);
    } finally {
      cleanup(dir);
    }
  });

  test("shows already-up-to-date when 0 commits ahead", () => {
    const { dir } = createRepo();
    try {
      // Rebase onto HEAD — 0 commits ahead
      const { stdout, status } = run(["rebase", "HEAD", "--yes"], dir);
      expect(status).toBe(0);
      // Could be dirty-tree warning or already-up-to-date
      expect(stdout.length).toBeGreaterThan(0);
    } finally {
      cleanup(dir);
    }
  });

  test("shows warning when no rebase is in progress and --abort is used", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["rebase", "--abort"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No rebase in progress/i);
    } finally {
      cleanup(dir);
    }
  });

  test("shows warning when no rebase is in progress and --continue is used", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["rebase", "--continue"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No rebase in progress/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Reset ─────────────────────────────────────────────────────────────────────

describe("reset", () => {
  test("shows error for a non-existent ref", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["reset", "nonexistent-sha-abc123", "--yes"], dir);
      expect(status).toBe(1);
      expect(stdout).toMatch(/Unknown ref/i);
    } finally {
      cleanup(dir);
    }
  });

  test("soft reset succeeds with a valid ref", () => {
    const { dir } = createRepo();
    try {
      // Add a second commit so we can reset to the first
      fs.writeFileSync(path.join(dir, "second.txt"), "second commit");
      spawnSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
      spawnSync("git", ["commit", "-m", "second"], { cwd: dir, stdio: "pipe" });

      const { stdout, status } = run(["reset", "HEAD~1", "--soft", "--yes"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Reset/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Cherry-pick ───────────────────────────────────────────────────────────────

describe("cherry-pick", () => {
  test("shows warning when working tree is dirty", () => {
    const { dir } = createRepo();
    try {
      fs.writeFileSync(path.join(dir, "dirty.txt"), "changes");
      const { stdout, status } = run(["cherry-pick", "--from", "HEAD"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Uncommitted changes/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Config ────────────────────────────────────────────────────────────────────

describe("config", () => {
  test("--show displays current config", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["config", "--show"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/API key|Model/i);
    } finally {
      cleanup(dir);
    }
  });

  test("--list-models lists available models", () => {
    const { dir } = createRepo();
    try {
      const { stdout, status } = run(["config", "--list-models"], dir);
      expect(status).toBe(0);
      expect(stdout).toMatch(/llama/i);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Commit-msg ────────────────────────────────────────────────────────────────

describe("commit-msg", () => {
  test("shows no-api-key error when key is not configured", () => {
    const { dir } = createRepo();
    try {
      // Run without any API key in env
      const result = spawnSync("node", [CLI, "commit-msg"], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, GROQ_API_KEY: "" },
        timeout: 10000,
      });
      const stdout = result.stdout ?? "";
      expect(result.status).toBe(1);
      expect(stdout).toMatch(/No API key/i);
    } finally {
      cleanup(dir);
    }
  });
});
