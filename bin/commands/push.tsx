import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import {
  stageAll,
  commit,
  push,
  getCurrentBranch,
  getDiffContent,
  getDiff,
} from "../git.js";
import { loadConfig, generateCommitMessage } from "../utils/index.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { StreamText } from "../components/StreamText.js";
import { PushOptions, Phase } from "../types/index.js";
import { PHASE_LABEL } from "../constants/index.js";

interface PushFlowProps {
  message: string | undefined;
  options: PushOptions;
  branch: string;
  onError: () => void;
}

function PushFlow({
  message,
  options,
  branch,
  onError,
}: PushFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("staging");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [commitMessage, setCommitMessage] = React.useState<string | null>(null);
  const commitMessageRef = React.useRef<string | null>(null);
  const [diffStatLines, setDiffStatLines] = React.useState<string[]>([]);
  const [model, setModel] = React.useState("");

  // After streaming completes, do commit + push
  // Uses a ref so this callback stays stable — changing commitMessage state
  // would otherwise recreate this function, causing StreamText's useEffect
  // to restart the interval mid-stream and fire onComplete with a stale closure.
  const handleStreamDone = React.useCallback(() => {
    void (async () => {
      try {
        const msg = commitMessageRef.current;
        if (!msg) return;

        if (options.dryRun) {
          setPhase("dry-run");
          setTimeout(() => exit(), 0);
          return;
        }

        setPhase("committing");
        commit(msg);
        setPhase("pushing");
        push(branch);
        setPhase("done");
        setTimeout(() => exit(), 0);
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
        onError();
        setTimeout(() => exit(), 0);
      }
    })();
  }, [branch, exit, onError, options.dryRun]);

  React.useEffect(() => {
    void (async () => {
      try {
        // Validate inputs first
        //
        if (!options.ai && !message) {
          setPhase("no-message");
          onError();
          setTimeout(() => exit(), 0);
          return;
        }

        if (options.dryRun && !options.ai) {
          // Manual dry run — just show what would happen
          //
          setCommitMessage(message ?? "");
          setPhase("dry-run");
          setTimeout(() => exit(), 0);
          return;
        }

        // Stage all
        setPhase("staging");
        stageAll();

        if (options.ai) {
          const config = loadConfig();
          setModel(config.model);

          if (!config.apiKey) {
            setPhase("no-api-key");
            onError();
            setTimeout(() => exit(), 0);
            return;
          }

          const diff = getDiffContent(true);
          const diffStat = getDiff(true);

          if (!diff && !diffStat) {
            setPhase("nothing-to-commit");
            setTimeout(() => exit(), 0);
            return;
          }

          if (diffStat) {
            setDiffStatLines(diffStat.split("\n").filter(Boolean));
          }

          setPhase("generating-ai");
          const msg = await generateCommitMessage(
            config.apiKey,
            config.model,
            diff ?? "",
          );
          commitMessageRef.current = msg;
          setCommitMessage(msg);
          setPhase("streaming");
          // handleStreamDone takes over from here via StreamText.onComplete
        } else {
          // Manual path
          const msg = message ?? "";
          setCommitMessage(msg);
          setPhase("committing");
          commit(msg);
          setPhase("pushing");
          push(branch);
          setPhase("done");
          setTimeout(() => exit(), 0);
        }
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
        onError();
        setTimeout(() => exit(), 0);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render by phase ──────────────────────────────────────────────────────────

  if (phase === "no-message") {
    return (
      <Panel
        variant="warning"
        title="No commit message"
        lines={[
          'Provide a message: git-helper push "your message"',
          "Or use AI:           git-helper push --ai",
        ]}
      />
    );
  }

  if (phase === "no-api-key") {
    return (
      <Panel
        variant="error"
        title="No API key configured"
        lines={[
          "Get a free key at https://console.groq.com",
          "",
          "Then run:",
          "  git-helper config --set-key <your-key>",
        ]}
      />
    );
  }

  if (phase === "nothing-to-commit") {
    return (
      <Panel
        variant="warning"
        title="Nothing to commit"
        lines={["Stage some changes first with git add"]}
      />
    );
  }

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="Error"
        lines={[errMsg ?? "Unknown error"]}
      />
    );
  }

  if (phase === "dry-run") {
    const msg = commitMessage ?? message ?? "";
    return (
      <Panel
        variant="info"
        title="Dry run"
        lines={[
          "Would execute:",
          "  git add .",
          `  git commit -m "${msg}"`,
          `  git push origin ${branch}`,
        ]}
      />
    );
  }

  if (phase === "done") {
    const msg = commitMessage ?? message ?? "";
    return (
      <Panel
        variant="success"
        title="Done"
        lines={[msg, "", `Branch: ${branch}`]}
      />
    );
  }

  if (phase === "streaming" && commitMessage !== null) {
    return (
      <InkBox flexDirection="column">
        {diffStatLines.length > 0 && (
          <InkBox flexDirection="column" marginBottom={1}>
            <InkBox>
              <Text color="#7C6FF7">{"┌─"} </Text>
              <Text bold>{"Changes"}</Text>
            </InkBox>
            {diffStatLines.map((line, i) => (
              <Text key={i} color="#6B7280">
                {"  " + line}
              </Text>
            ))}
          </InkBox>
        )}
        <InkBox>
          <Text color="#7C6FF7">{"  ✦ "}</Text>
          <StreamText
            text={commitMessage}
            delayMs={6}
            onComplete={handleStreamDone}
          />
        </InkBox>
      </InkBox>
    );
  }

  if (phase === "generating-ai") {
    return (
      <InkBox flexDirection="column">
        {diffStatLines.length > 0 && (
          <InkBox flexDirection="column" marginBottom={1}>
            <InkBox>
              <Text color="#7C6FF7">{"┌─"} </Text>
              <Text bold>{"Changes"}</Text>
            </InkBox>
            {diffStatLines.map((line, i) => (
              <Text key={i} color="#6B7280">
                {"  " + line}
              </Text>
            ))}
          </InkBox>
        )}
        <SpinnerLine text={`Generating commit message with ${model}…`} />
      </InkBox>
    );
  }

  // staging / committing / pushing
  const label = PHASE_LABEL[phase] ?? `${phase}…`;
  return <SpinnerLine text={label} />;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runPushCommand(
  message: string | undefined,
  options: PushOptions,
): Promise<void> {
  const branch = options.branch ?? getCurrentBranch();
  let failed = false;

  const { waitUntilExit } = render(
    <PushFlow
      message={message}
      options={options}
      branch={branch}
      onError={() => {
        failed = true;
      }}
    />,
  );

  await waitUntilExit();

  if (failed) process.exit(1);
}
