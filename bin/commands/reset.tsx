import React from "react";
import { render, useApp, Text } from "ink";
import { reset, getAffectedFiles, refExists } from "../git.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { ConfirmPrompt } from "../components/ConfirmPrompt.js";
import { icon } from "../components/icons.js";
import { ResetOptions, Mode, Phase } from "../types/index.js";

function ResetFlow({
  ref: gitRef,
  mode,
  options,
  onError,
}: {
  ref: string;
  mode: Mode;
  options: ResetOptions;
  onError: () => void;
}): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [affectedFiles, setAffectedFiles] = React.useState<string[]>([]);

  const doReset = React.useCallback(() => {
    try {
      setPhase("resetting");
      reset(gitRef, mode);
      setPhase("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
      onError();
    }
  }, [gitRef, mode, onError]);

  React.useEffect(() => {
    if (phase === "done" || phase === "error") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    if (!refExists(gitRef)) {
      setErrMsg(`Unknown ref: "${gitRef}"`);
      setPhase("error");
      onError();
      return;
    }

    const files = getAffectedFiles(gitRef);
    setAffectedFiles(files);

    // --hard always shows confirm regardless of --yes
    if (mode === "hard") {
      setPhase("confirm");
      return;
    }

    if (options.yes) {
      doReset();
      return;
    }

    setPhase("confirm");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Reset failed"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Reset"
        lines={[`${icon.reset} Reset --${mode} to ${gitRef}`]}
      />
    );
  }

  if (phase === "confirm") {
    const fileList = affectedFiles.slice(0, 5).map((f) => `  ${f}`);
    if (affectedFiles.length > 5)
      fileList.push(`  … and ${affectedFiles.length - 5} more`);

    let msg: string;
    if (mode === "soft") {
      msg = `Uncommit changes to ${gitRef}? (changes stay staged)`;
    } else if (mode === "mixed") {
      msg = `Uncommit changes to ${gitRef}? (changes become unstaged)`;
    } else {
      msg = `Permanently discard all changes back to ${gitRef}? This cannot be undone.`;
    }

    const lines = mode === "hard" && affectedFiles.length > 0 ? fileList : [];

    return (
      <>
        {lines.length > 0
          ? lines.map((l, i) => (
              <Text key={i} color="#6B7280">
                {l}
              </Text>
            ))
          : null}
        <ConfirmPrompt
          message={msg}
          danger={mode === "hard"}
          onConfirm={doReset}
          onCancel={() => setTimeout(() => exit(), 0)}
        />
      </>
    );
  }

  return <SpinnerLine text="Preparing reset…" />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runResetCommand(
  ref: string | undefined,
  options: ResetOptions,
): Promise<void> {
  const gitRef = ref ?? "HEAD";
  const mode: Mode = options.hard ? "hard" : options.soft ? "soft" : "mixed";
  let failed = false;

  const { waitUntilExit } = render(
    <ResetFlow
      ref={gitRef}
      mode={mode}
      options={options}
      onError={() => {
        failed = true;
      }}
    />,
  );
  await waitUntilExit();
  if (failed) process.exit(1);
}
