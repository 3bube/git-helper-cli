import React from "react";
import { render, useApp } from "ink";
import {
  rebase,
  rebaseAbort,
  rebaseContinue,
  isRebasing,
  hasUncommittedChanges,
  getCommitCount,
  getCurrentBranch,
} from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { ConfirmPrompt } from "../components/ConfirmPrompt.js";
import { icon } from "../components/icons.js";
import { Phase, RebaseOptions } from "../types/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

function RebaseFlow({
  target,
  options,
  onError,
}: {
  target: string | undefined;
  options: RebaseOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [warnMsg, setWarnMsg] = React.useState<string[]>([]);
  const [conflicts, setConflicts] = React.useState<string[]>([]);
  const [commitCount, setCommitCount] = React.useState(0);
  const resolvedTargetRef = React.useRef<string>("");

  const doRebase = React.useCallback(() => {
    try {
      setPhase("rebasing");
      const conflicted = rebase(resolvedTargetRef.current);
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
    setTimeout(() => exit(), 0);
  }, [exit, onError]);

  React.useEffect(() => {
    // Handle --abort
    if (options.abort) {
      if (!isRebasing()) {
        setWarnMsg(["No rebase in progress."]);
        setPhase("warning");
        setTimeout(() => exit(), 0);
        return;
      }
      if (options.yes) {
        try {
          rebaseAbort();
          setPhase("done");
        } catch (err) {
          setErrMsg(err instanceof Error ? err.message : String(err));
          setPhase("error");
          onError();
        }
        setTimeout(() => exit(), 0);
        return;
      }
      setPhase("confirm-abort");
      return;
    }

    // Handle --continue
    if (options.continue) {
      if (!isRebasing()) {
        setWarnMsg(["No rebase in progress."]);
        setPhase("warning");
        setTimeout(() => exit(), 0);
        return;
      }
      if (hasUncommittedChanges()) {
        setWarnMsg([
          "Stage your resolved conflicts first.",
          "  git add <file>",
          "  git rebase --continue",
        ]);
        setPhase("warning");
        setTimeout(() => exit(), 0);
        return;
      }
      try {
        rebaseContinue();
        setPhase("done");
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
        onError();
      }
      setTimeout(() => exit(), 0);
      return;
    }

    // Normal rebase
    if (isRebasing()) {
      setWarnMsg([
        "A rebase is in progress.",
        "Use --continue to resume or --abort to cancel.",
      ]);
      setPhase("warning");
      setTimeout(() => exit(), 0);
      return;
    }

    const resolved =
      target ??
      (() => {
        const branch = getCurrentBranch();
        const upstream = `origin/${branch}`;
        return upstream;
      })();
    resolvedTargetRef.current = resolved;

    const count = getCommitCount(resolved);
    setCommitCount(count);

    if (options.yes) {
      doRebase();
      return;
    }

    setPhase("confirm");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "warning") {
    return <Panel variant="warning" title="Rebase" lines={warnMsg} />;
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Rebase failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "conflict") {
    return (
      <Panel
        variant="warning"
        title="Rebase paused — conflicts"
        lines={[
          "Resolve conflicts in:",
          ...conflicts.map((f) => `  ${f}`),
          "",
          "Then run: git-helper rebase --continue",
          "Or:       git-helper rebase --abort",
        ]}
      />
    );
  }

  if (phase === "done") {
    if (options.abort) {
      return (
        <Panel
          variant="success"
          title="Aborted"
          lines={[`${icon.rebase} Rebase aborted`]}
        />
      );
    }
    if (options.continue) {
      return (
        <Panel
          variant="success"
          title="Continued"
          lines={[`${icon.rebase} Rebase continued`]}
        />
      );
    }
    return (
      <Panel
        variant="success"
        title="Rebased"
        lines={[`${icon.rebase} Rebased onto ${resolvedTargetRef.current}`]}
      />
    );
  }

  if (phase === "confirm-abort") {
    return (
      <ConfirmPrompt
        message="Abort the rebase and return to the original branch?"
        danger
        onConfirm={() => {
          try {
            rebaseAbort();
            setPhase("done");
          } catch (err) {
            setErrMsg(err instanceof Error ? err.message : String(err));
            setPhase("error");
            onError();
          }
          setTimeout(() => exit(), 0);
        }}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  if (phase === "confirm") {
    const t = resolvedTargetRef.current;
    return (
      <ConfirmPrompt
        message={`Rebase ${commitCount} commit(s) onto "${t}"?`}
        onConfirm={doRebase}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  return <SpinnerLine text="Checking rebase state…" />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runRebaseCommand(
  target: string | undefined,
  options: RebaseOptions,
): Promise<void> {
  let failed = false;
  const { waitUntilExit } = render(
    <RebaseFlow
      target={target}
      options={options}
      onError={() => {
        failed = true;
      }}
    />,
  );
  await waitUntilExit();
  if (failed) process.exit(1);
}
