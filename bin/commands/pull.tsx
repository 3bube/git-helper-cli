import React from "react";
import { render, useApp, Text } from "ink";
import { pull, getCurrentBranch, hasRemote, isDetachedHead } from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";

export interface PullOptions {
  branch?: string | undefined;
}

type Phase = "pulling" | "done" | "conflict" | "no-remote" | "error";

function PullFlow({ branch, onError }: { branch: string; onError: () => void }): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("pulling");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [conflictFiles, setConflictFiles] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isDetachedHead()) {
      setErrMsg("You are in detached HEAD state. Checkout a branch first.");
      setPhase("error");
      onError();
      setTimeout(() => exit(), 0);
      return;
    }

    if (!hasRemote("origin")) {
      setPhase("no-remote");
      setTimeout(() => exit(), 0);
      return;
    }

    try {
      pull(branch);
      setPhase("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("CONFLICT") || msg.includes("Automatic merge failed")) {
        const files = (msg.match(/CONFLICT.*?: (.+)/g) ?? [])
          .map((l) => l.replace(/CONFLICT.*?: /, "").trim())
          .filter(Boolean);
        setConflictFiles(files);
        setPhase("conflict");
        setTimeout(() => exit(), 0);
        return;
      }

      if (msg.includes("no tracking information") || msg.includes("There is no tracking")) {
        setPhase("no-remote");
        setTimeout(() => exit(), 0);
        return;
      }

      setErrMsg(msg);
      setPhase("error");
      onError();
    }
    setTimeout(() => exit(), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "done") {
    return (
      <Text color="#4ADE80">
        {"✓ Pulled latest from "}
        <Text color="#7C6FF7">{branch}</Text>
      </Text>
    );
  }

  if (phase === "conflict") {
    return (
      <Panel
        variant="warning"
        title="Merge conflicts"
        lines={[
          "Pull succeeded but there are conflicts to resolve:",
          ...(conflictFiles.length > 0
            ? conflictFiles.map((f) => `  ${f}`)
            : ["  (run git status to see conflicting files)"]),
          "",
          "Resolve conflicts, then:",
          "  git add .",
          "  git commit",
        ]}
      />
    );
  }

  if (phase === "no-remote") {
    return (
      <Panel
        variant="warning"
        title="No upstream configured"
        lines={[
          `Branch "${branch}" has no remote tracking branch.`,
          "",
          "Set one with:",
          `  git push -u origin ${branch}`,
        ]}
      />
    );
  }

  if (phase === "error") {
    return <Panel variant="error" title="Pull failed" lines={[errMsg ?? "Unknown error"]} />;
  }

  return <SpinnerLine text={`Pulling from ${branch}…`} />;
}

export async function runPullCommand(options: PullOptions): Promise<void> {
  const branch = options.branch ?? getCurrentBranch();
  let failed = false;

  const { waitUntilExit } = render(
    <PullFlow branch={branch} onError={() => { failed = true; }} />,
  );

  await waitUntilExit();
  if (failed) process.exit(1);
}
