import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import { stashSave, stashPop, stashApply, stashList, hasUncommittedChanges } from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { ConfirmPrompt } from "../components/ConfirmPrompt.js";
import { icon } from "../components/icons.js";
import { StashOptions } from "../types/index.js";

function StashSaveFlow({
  message,
  onError,
}: {
  message: string | undefined;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<"saving" | "done" | "error" | "empty">(
    "saving",
  );
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (phase === "done" || phase === "error" || phase === "empty") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    if (!hasUncommittedChanges()) {
      setPhase("empty");
      return;
    }
    try {
      stashSave(message);
      setPhase("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "empty") {
    return <Panel variant="info" title="Nothing to stash" lines={["Working tree is clean."]} />;
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Stash failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Stashed"
        lines={[
          `${icon.stash} Changes stashed${message ? `: ${message}` : ""}`,
        ]}
      />
    );
  }

  return <SpinnerLine text="Stashing changes…" />;
}

// ── stash pop ─────────────────────────────────────────────────────────────────

function StashPopFlow({ onError }: { onError: () => void }): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<
    "popping" | "done" | "conflict" | "empty" | "error"
  >("popping");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (phase === "done" || phase === "conflict" || phase === "empty" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    try {
      const list = stashList();
      if (list.length === 0) {
        setPhase("empty");
        return;
      }
      const conflicted = stashPop();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "empty") {
    return (
      <Panel
        variant="info"
        title="Nothing to pop"
        lines={["No stashes found."]}
      />
    );
  }

  if (phase === "conflict") {
    return (
      <Panel
        variant="warning"
        title="Conflicts after pop"
        lines={[
          "Resolve conflicts in:",
          ...conflicts.map((f) => `  ${f}`),
          "",
          "Then run: git add .",
        ]}
      />
    );
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Pop failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Popped"
        lines={[`${icon.stash} Stash applied and removed`]}
      />
    );
  }

  return <SpinnerLine text="Applying stash…" />;
}

// ── stash list ────────────────────────────────────────────────────────────────

function StashListFlow(): React.JSX.Element {
  const { exit } = useApp();
  const entries = stashList();

  React.useEffect(() => {
    setTimeout(() => exit(), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (entries.length === 0) {
    return (
      <Panel
        variant="info"
        title="No stashes"
        lines={["Nothing stashed yet."]}
      />
    );
  }

  return (
    <InkBox flexDirection="column">
      <InkBox marginBottom={1}>
        <Text color="#7C6FF7">{icon.stash} </Text>
        <Text bold>Stash list</Text>
      </InkBox>
      {entries.map((e) => (
        <InkBox key={e.index}>
          <Text color="#7C6FF7">{`  ${e.index}  `}</Text>
          <Text>{e.message}</Text>
          <Text color="#6B7280">{`  ${e.date}`}</Text>
        </InkBox>
      ))}
    </InkBox>
  );
}

// ── stash apply ───────────────────────────────────────────────────────────────

type ApplyPhase = "confirm" | "applying" | "done" | "conflict" | "error";

function StashApplyFlow({
  index,
  options,
  onError,
}: {
  index: number;
  options: StashOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<ApplyPhase>(
    options.yes ? "applying" : "confirm",
  );
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<string[]>([]);
  const entries = stashList();
  const entry = entries[index];

  const doApply = React.useCallback(() => {
    if (index >= entries.length) {
      setErrMsg(`No stash@{${index}} — only ${entries.length} stash(es) exist.`);
      setPhase("error");
      onError();
      return;
    }
    try {
      setPhase("applying");
      const conflicted = stashApply(index);
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
  }, [index, onError]);

  React.useEffect(() => {
    if (phase === "done" || phase === "conflict" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    if (options.yes) doApply();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "conflict") {
    return (
      <Panel
        variant="warning"
        title="Conflicts after apply"
        lines={[
          "Resolve conflicts in:",
          ...conflicts.map((f) => `  ${f}`),
          "",
          "Then run: git add .",
        ]}
      />
    );
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Apply failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Applied"
        lines={[`${icon.stash} Stash ${index} applied`]}
      />
    );
  }

  if (phase === "confirm") {
    const msg = entry
      ? `Apply stash@{${index}}: "${entry.message}"?`
      : `Apply stash@{${index}}?`;
    return (
      <ConfirmPrompt
        message={msg}
        onConfirm={doApply}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  return <SpinnerLine text="Applying stash…" />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runStashCommand(
  subcommand: string,
  arg: string | undefined,
  options: StashOptions,
): Promise<void> {
  let failed = false;
  const onError = () => {
    failed = true;
  };

  if (subcommand === "save") {
    const { waitUntilExit } = render(
      <StashSaveFlow message={arg} onError={onError} />,
    );
    await waitUntilExit();
  } else if (subcommand === "pop") {
    const { waitUntilExit } = render(<StashPopFlow onError={onError} />);
    await waitUntilExit();
  } else if (subcommand === "list") {
    const { waitUntilExit } = render(<StashListFlow />);
    await waitUntilExit();
  } else if (subcommand === "apply") {
    const index = parseInt(arg ?? "0", 10);
    const { waitUntilExit } = render(
      <StashApplyFlow index={index} options={options} onError={onError} />,
    );
    await waitUntilExit();
  } else {
    console.error(`Unknown stash subcommand: ${subcommand}`);
    process.exit(1);
  }

  if (failed) process.exit(1);
}
