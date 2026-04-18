import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import { getDiffContent, getDiff, isGitRepo } from "../git.js";
import { loadConfig, generateCommitMessage } from "../utils/index.js";
import { Panel } from "../components/Panel.js";
import { SpinnerLine } from "../components/SpinnerLine.js";
import { StreamText } from "../components/StreamText.js";
import { Phase } from "../types/index.js";

interface CommitMsgFlowProps {
  onError: () => void;
}

function CommitMsgFlow({ onError }: CommitMsgFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<Phase>("validating");
  const [message, setMessage] = React.useState<string | null>(null);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);
  const [warnMsg, setWarnMsg] = React.useState<string | null>(null);
  const [statLines, setStatLines] = React.useState<string[]>([]);
  const [model, setModel] = React.useState("");

  React.useEffect(() => {
    if (phase === "error" || phase === "warning" || phase === "done") exit();
  }, [phase, exit]);

  React.useEffect(() => {
    void (async () => {
      try {
        if (!isGitRepo()) {
          setErrMsg("Not a git repository");
          setPhase("error");
          onError();
          return;
        }

        const config = loadConfig();
        setModel(config.model);

        if (!config.apiKey) {
          setErrMsg("Run: git-helper config --set-key <your-key>");
          setPhase("error");
          onError();
          return;
        }

        const diff = getDiffContent(true);
        const stat = getDiff(true);

        if (!diff) {
          setWarnMsg("Run git add first to stage your changes.");
          setPhase("warning");
          return;
        }

        if (stat) {
          setStatLines(stat.split("\n").filter(Boolean));
        }

        setPhase("generating");
        const msg = await generateCommitMessage(
          config.apiKey,
          config.model,
          diff,
        );
        setMessage(msg);
        setPhase("streaming");
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
        onError();
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStreamDone = React.useCallback(() => {
    setPhase("done");
  }, []);

  if (phase === "error") {
    return (
      <Panel
        variant="error"
        title="No API key configured"
        lines={errMsg !== null ? [errMsg] : []}
      />
    );
  }

  if (phase === "warning") {
    return (
      <Panel
        variant="warning"
        title="No staged changes"
        lines={warnMsg !== null ? [warnMsg] : []}
      />
    );
  }

  if (phase === "generating") {
    return (
      <InkBox flexDirection="column">
        {statLines.length > 0 && (
          <InkBox flexDirection="column" marginBottom={1}>
            <InkBox>
              <Text color="#7C6FF7">{"┌─"} </Text>
              <Text bold>{"Staged changes"}</Text>
            </InkBox>
            {statLines.map((line, i) => (
              <Text key={i} color="#6B7280">
                {"  " + line}
              </Text>
            ))}
          </InkBox>
        )}
        <SpinnerLine text={`Thinking with ${model}…`} />
      </InkBox>
    );
  }

  if (phase === "streaming" && message !== null) {
    return (
      <InkBox flexDirection="column">
        {statLines.length > 0 && (
          <InkBox flexDirection="column" marginBottom={1}>
            <InkBox>
              <Text color="#7C6FF7">{"┌─"} </Text>
              <Text bold>{"Staged changes"}</Text>
            </InkBox>
            {statLines.map((line, i) => (
              <Text key={i} color="#6B7280">
                {"  " + line}
              </Text>
            ))}
          </InkBox>
        )}
        <InkBox>
          <Text color="#7C6FF7">{"  ✦ "}</Text>
          <StreamText
            text={message}
            delayMs={6}
            onComplete={handleStreamDone}
          />
        </InkBox>
      </InkBox>
    );
  }

  if (phase === "done" && message !== null) {
    return (
      <InkBox flexDirection="column">
        <InkBox>
          <Text color="#7C6FF7">{"  ✦ "}</Text>
          <Text color="#7C6FF7">{message}</Text>
        </InkBox>
        <Text color="#6B7280">{`  Copy and use with: git commit -m "${message}"`}</Text>
      </InkBox>
    );
  }

  // validating — brief flash before effect fires
  return <Text color="#6B7280">{"Checking…"}</Text>;
}

export async function runCommitMsgCommand(): Promise<void> {
  let failed = false;

  const { waitUntilExit } = render(
    <CommitMsgFlow
      onError={() => {
        failed = true;
      }}
    />,
  );

  await waitUntilExit();

  if (failed) process.exit(1);
}
