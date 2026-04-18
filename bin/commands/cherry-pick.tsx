import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import { getBranches, getLogFrom, cherryPick, getCurrentBranch, hasUncommittedChanges } from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { SelectList } from "../components/SelectList.js";
import { ConfirmPrompt } from "../components/ConfirmPrompt.js";
import { icon } from "../components/icons.js";
import type { GitLog } from "../types/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CherryPickOptions {
  from?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase =
  | "checking"
  | "select-branch"
  | "select-commit"
  | "confirm"
  | "picking"
  | "done"
  | "conflict"
  | "error"
  | "dirty"
  | "no-commits";

function CherryPickFlow({
  from,
  onError,
}: {
  from: string | undefined;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<string[]>([]);
  const [branchItems, setBranchItems] = React.useState<Array<{ label: string; value: string }>>([]);
  const [commitItems, setCommitItems] = React.useState<Array<{ label: string; value: string }>>([]);
  const selectedCommitRef = React.useRef<GitLog | null>(null);
  const commitMapRef = React.useRef<Map<string, GitLog>>(new Map());

  const doPick = React.useCallback(() => {
    const commit = selectedCommitRef.current;
    if (!commit) return;
    try {
      setPhase("picking");
      const conflicted = cherryPick(commit.hash);
      if (conflicted.length > 0) {
        setConflicts(conflicted);
        setPhase("conflict");
      } else {
        setPhase("done");
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    }
  }, [onError]);

  const loadCommits = React.useCallback((branch: string) => {
    const logs = getLogFrom(branch, 20);
    if (logs.length === 0) {
      setPhase("no-commits");
      return;
    }
    const map = new Map<string, GitLog>();
    const items = logs.map((l) => {
      map.set(l.shortHash, l);
      const label = `${l.shortHash}  ${l.message.slice(0, 50)}  ${l.date}`;
      return { label, value: l.shortHash };
    });
    commitMapRef.current = map;
    setCommitItems(items);
    setPhase("select-commit");
  }, []);

  React.useEffect(() => {
    if (phase === "dirty" || phase === "done" || phase === "conflict" || phase === "error" || phase === "no-commits") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    if (hasUncommittedChanges()) {
      setPhase("dirty");
      return;
    }

    if (from) {
      loadCommits(from);
    } else {
      const current = getCurrentBranch();
      const others = getBranches().filter((b) => !b.current && b.name !== current);
      setBranchItems(others.map((b) => ({ label: b.name, value: b.name })));
      setPhase("select-branch");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "dirty") {
    return (
      <Panel
        variant="warning"
        title="Uncommitted changes"
        lines={[
          "Stash or commit your changes before cherry-picking:",
          "  git-helper stash save",
        ]}
      />
    );
  }

  if (phase === "no-commits") {
    return (
      <Panel
        variant="info"
        title="No commits found"
        lines={[`No commits found in "${from ?? "selected branch"}".`]}
      />
    );
  }

  if (phase === "error") {
    return <Panel variant="error" title="Cherry-pick failed" lines={[errMsg ?? "Unknown error"]} />;
  }

  if (phase === "conflict") {
    return (
      <Panel
        variant="warning"
        title="Cherry-pick paused — conflicts"
        lines={[
          "Resolve conflicts in:",
          ...conflicts.map((f) => `  ${f}`),
          "",
          "Then run: git add . && git cherry-pick --continue",
          "Or:       git cherry-pick --abort",
        ]}
      />
    );
  }

  if (phase === "done") {
    const commit = selectedCommitRef.current;
    return (
      <Panel
        variant="success"
        title="Cherry-picked"
        lines={[
          `${icon.cherryPick} ${commit?.shortHash ?? ""}: ${commit?.message ?? ""}`,
        ]}
      />
    );
  }

  if (phase === "select-branch") {
    return (
      <InkBox flexDirection="column">
        <InkBox marginBottom={1}>
          <Text color="#7C6FF7">{icon.cherryPick} </Text>
          <Text bold>Select source branch</Text>
        </InkBox>
        <SelectList
          items={branchItems}
          onSelect={(value) => loadCommits(value)}
        />
      </InkBox>
    );
  }

  if (phase === "select-commit") {
    return (
      <InkBox flexDirection="column">
        <InkBox marginBottom={1}>
          <Text color="#7C6FF7">{icon.cherryPick} </Text>
          <Text bold>Select commit to cherry-pick</Text>
        </InkBox>
        <SelectList
          items={commitItems}
          onSelect={(value) => {
            const commit = commitMapRef.current.get(value) ?? null;
            selectedCommitRef.current = commit;
            setPhase("confirm");
          }}
        />
      </InkBox>
    );
  }

  if (phase === "confirm") {
    const commit = selectedCommitRef.current;
    const msg = commit
      ? `Cherry-pick ${commit.shortHash}: "${commit.message.slice(0, 60)}"?`
      : "Cherry-pick selected commit?";
    return (
      <ConfirmPrompt
        message={msg}
        onConfirm={doPick}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  return <SpinnerLine text="Checking…" />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runCherryPickCommand(options: CherryPickOptions): Promise<void> {
  let failed = false;
  const { waitUntilExit } = render(
    <CherryPickFlow from={options.from} onError={() => { failed = true; }} />,
  );
  await waitUntilExit();
  if (failed) process.exit(1);
}
