import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import {
  getBranches,
  createBranch,
  switchBranch,
  deleteBranch,
  isBranchMerged,
  hasUncommittedChanges,
} from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { SelectList } from "../components/SelectList.js";
import { ConfirmPrompt } from "../components/ConfirmPrompt.js";
import { icon } from "../components/icons.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BranchOptions {
  switch?: boolean;
  force?: boolean;
  yes?: boolean;
}

// ── branch list ───────────────────────────────────────────────────────────────

function BranchListFlow(): React.JSX.Element {
  const { exit } = useApp();
  const branches = getBranches();

  React.useEffect(() => {
    setTimeout(() => exit(), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InkBox flexDirection="column">
      <InkBox marginBottom={1}>
        <Text color="#7C6FF7">{icon.branch} </Text>
        <Text bold>Branches</Text>
      </InkBox>
      {branches.map((b) => (
        <InkBox key={b.name}>
          <Text color={b.current ? "#7C6FF7" : "#6B7280"}>
            {b.current ? "  ◆ " : "    "}
          </Text>
          <Text bold={b.current}>{b.name}</Text>
          {b.upstream ? <Text color="#6B7280">{"  " + b.upstream}</Text> : null}
          {b.merged ? <Text color="#4ADE80">{"  merged"}</Text> : null}
        </InkBox>
      ))}
    </InkBox>
  );
}

// ── branch create ─────────────────────────────────────────────────────────────

type CreatePhase = "creating" | "confirm-switch" | "done" | "error";

function BranchCreateFlow({
  name,
  options,
  onError,
}: {
  name: string;
  options: BranchOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<CreatePhase>("creating");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [switched, setSwitched] = React.useState(false);

  React.useEffect(() => {
    if (phase === "done" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    try {
      createBranch(name);

      if (options.switch) {
        switchBranch(name);
        setSwitched(true);
        setPhase("done");
      } else if (options.yes) {
        setPhase("done");
      } else {
        setPhase("confirm-switch");
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "error") {
    return <Panel variant="error" title="Branch error" lines={[errMsg ?? "Unknown error"]} />;
  }

  if (phase === "done") {
    const lines = [`${icon.branchCreate} Created branch: ${name}`];
    if (switched) lines.push(`${icon.branchSwitch} Switched to ${name}`);
    return <Panel variant="success" title="Done" lines={lines} />;
  }

  if (phase === "confirm-switch") {
    return (
      <ConfirmPrompt
        message={`Switch to "${name}" now?`}
        onConfirm={() => {
          try {
            switchBranch(name);
            setSwitched(true);
          } catch (err) {
            setErrMsg(err instanceof Error ? err.message : String(err));
            setPhase("error");
            onError();
            setTimeout(() => exit(), 0);
            return;
          }
          setPhase("done");
          setTimeout(() => exit(), 0);
        }}
        onCancel={() => {
          setPhase("done");
          setTimeout(() => exit(), 0);
        }}
      />
    );
  }

  return <SpinnerLine text={`Creating branch ${name}…`} />;
}

// ── branch switch ─────────────────────────────────────────────────────────────

type SwitchPhase = "loading" | "selecting" | "confirm-dirty" | "done" | "error" | "already-on" | "no-others";

function BranchSwitchFlow({
  name,
  options,
  onError,
}: {
  name: string | undefined;
  options: BranchOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<SwitchPhase>("loading");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [branchItems, setBranchItems] = React.useState<Array<{ label: string; value: string }>>([]);
  const targetRef = React.useRef<string>(name ?? "");

  const doSwitch = React.useCallback(
    (target: string) => {
      try {
        switchBranch(target);
        targetRef.current = target;
        setPhase("done");
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
        onError();
      }
    },
    [onError],
  );

  React.useEffect(() => {
    if (phase === "already-on" || phase === "no-others" || phase === "done" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    const all = getBranches();
    const current = all.find((b) => b.current);

    if (name) {
      if (name === current?.name) {
        setPhase("already-on");
        return;
      }
      const dirty = hasUncommittedChanges();
      if (dirty && !options.yes) {
        targetRef.current = name;
        setPhase("confirm-dirty");
      } else {
        doSwitch(name);
      }
    } else {
      const others = all.filter((b) => !b.current);
      if (others.length === 0) {
        setPhase("no-others");
        return;
      }
      setBranchItems(others.map((b) => ({ label: b.name, value: b.name })));
      setPhase("selecting");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "already-on") {
    return (
      <Panel variant="info" title="Already on branch" lines={[`You are already on "${name ?? ""}".`]} />
    );
  }

  if (phase === "no-others") {
    return (
      <Panel variant="info" title="No other branches" lines={["Create a branch first:", "  git-helper branch create <name>"]} />
    );
  }

  if (phase === "error") {
    return <Panel variant="error" title="Switch failed" lines={[errMsg ?? "Unknown error"]} />;
  }

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Switched"
        lines={[`${icon.branchSwitch} Now on: ${targetRef.current}`]}
      />
    );
  }

  if (phase === "selecting") {
    return (
      <InkBox flexDirection="column">
        <InkBox marginBottom={1}>
          <Text color="#7C6FF7">{icon.branchSwitch} </Text>
          <Text bold>Select branch to switch to</Text>
        </InkBox>
        <SelectList
          items={branchItems}
          onSelect={(value) => {
            targetRef.current = value;
            const dirty = hasUncommittedChanges();
            if (dirty && !options.yes) {
              setPhase("confirm-dirty");
            } else {
              doSwitch(value);
            }
          }}
        />
      </InkBox>
    );
  }

  if (phase === "confirm-dirty") {
    const target = targetRef.current;
    return (
      <ConfirmPrompt
        message={`You have unstaged changes — they will carry over to "${target}". Continue?`}
        onConfirm={() => doSwitch(target)}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  return <SpinnerLine text="Loading branches…" />;
}

// ── branch delete ─────────────────────────────────────────────────────────────

type DeletePhase = "checking" | "confirm" | "done" | "error" | "blocked" | "is-current";

function BranchDeleteFlow({
  name,
  options,
  onError,
}: {
  name: string;
  options: BranchOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<DeletePhase>("checking");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [merged, setMerged] = React.useState(false);

  const doDelete = React.useCallback(() => {
    try {
      deleteBranch(name, options.force ?? false);
      setPhase("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    }
  }, [name, onError, options.force]);

  React.useEffect(() => {
    if (phase === "is-current" || phase === "blocked" || phase === "done" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    const branches = getBranches();
    const currentBranch = branches.find((b) => b.current);
    if (currentBranch?.name === name) {
      setPhase("is-current");
      return;
    }

    const isMerged = isBranchMerged(name);
    setMerged(isMerged);

    if (!isMerged && !options.force) {
      setPhase("blocked");
      return;
    }

    if (options.yes && (isMerged || options.force)) {
      doDelete();
      return;
    }

    setPhase("confirm");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "is-current") {
    return (
      <Panel
        variant="warning"
        title="Cannot delete current branch"
        lines={[`"${name}" is your current branch.`, "Switch to another branch first."]}
      />
    );
  }

  if (phase === "blocked") {
    return (
      <Panel
        variant="warning"
        title="Unmerged branch"
        lines={[`"${name}" has unmerged commits.`, "Use --force to delete it anyway."]}
      />
    );
  }

  if (phase === "error") {
    return <Panel variant="error" title="Delete failed" lines={[errMsg ?? "Unknown error"]} />;
  }

  if (phase === "done") {
    return (
      <Panel variant="success" title="Deleted" lines={[`${icon.branchDelete} Branch "${name}" deleted`]} />
    );
  }

  if (phase === "confirm") {
    return (
      <ConfirmPrompt
        message={`Delete branch "${name}"${!merged ? " (unmerged — force delete)" : ""}?`}
        danger={!merged}
        onConfirm={doDelete}
        onCancel={() => setTimeout(() => exit(), 0)}
      />
    );
  }

  return <SpinnerLine text={`Checking branch "${name}"…`} />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runBranchCommand(
  subcommand: string,
  name: string | undefined,
  options: BranchOptions,
): Promise<void> {
  let failed = false;
  const onError = () => { failed = true; };

  if (subcommand === "list" || !subcommand) {
    const { waitUntilExit } = render(<BranchListFlow />);
    await waitUntilExit();
    return;
  }

  if (subcommand === "create") {
    if (!name) {
      console.error("Branch name required: git-helper branch create <name>");
      process.exit(1);
    }
    const { waitUntilExit } = render(
      <BranchCreateFlow name={name} options={options} onError={onError} />,
    );
    await waitUntilExit();
  } else if (subcommand === "switch") {
    const { waitUntilExit } = render(
      <BranchSwitchFlow name={name} options={options} onError={onError} />,
    );
    await waitUntilExit();
  } else if (subcommand === "delete") {
    if (!name) {
      console.error("Branch name required: git-helper branch delete <name>");
      process.exit(1);
    }
    const { waitUntilExit } = render(
      <BranchDeleteFlow name={name} options={options} onError={onError} />,
    );
    await waitUntilExit();
  } else {
    console.error(`Unknown branch subcommand: ${subcommand}`);
    process.exit(1);
  }

  if (failed) process.exit(1);
}
