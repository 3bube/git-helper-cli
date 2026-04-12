import React from "react";
import { render, useApp, Text } from "ink";
import { pull, getCurrentBranch } from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";

export interface PullOptions {
  branch?: string | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "pulling" | "done" | "error";

interface PullFlowProps {
  branch: string;
  onError: () => void;
}

function PullFlow({ branch, onError }: PullFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("pulling");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      pull(branch);
      setPhase("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    } finally {
      setTimeout(() => exit(), 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "done") {
    return (
      <Text color="#4ADE80">
        {"✓ Pulled latest from "}
        <Text color="#7C6FF7">{branch}</Text>
      </Text>
    );
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Pull failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  return <SpinnerLine text={`Pulling from ${branch}…`} />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runPullCommand(options: PullOptions): Promise<void> {
  const branch = options.branch ?? getCurrentBranch();
  let failed = false;

  const { waitUntilExit } = render(
    <PullFlow branch={branch} onError={() => { failed = true; }} />,
  );

  await waitUntilExit();

  if (failed) process.exit(1);
}
