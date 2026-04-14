import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import { getGitStatus, getRecentLog } from "../git.js";
import { box } from "../ui.js";
import { BranchLine } from "../components/BranchLine.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { FileRow } from "../components/FileRow.js";
import { CommitLog } from "../components/CommitLog.js";
import { toFileStatus, HintLine } from "../utils/index.js";
import { GitLog, GitStatus, FileChange } from "../types/index.js";

interface StatusDashboardProps {
  status: GitStatus;
  log: GitLog[];
}

function StatusDashboard({
  status,
  log,
}: StatusDashboardProps): React.JSX.Element {
  const { exit } = useApp();

  React.useEffect(() => {
    // One-shot display — exit after first paint
    exit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isClean =
    status.staged.length === 0 &&
    status.unstaged.length === 0 &&
    status.untracked.length === 0;

  return (
    <InkBox flexDirection="column" marginBottom={1}>
      {/* Branch */}
      <BranchLine
        branch={status.branch}
        upstream={status.upstream}
        ahead={status.ahead}
        behind={status.behind}
      />

      {/* Staged */}
      {status.staged.length > 0 && (
        <InkBox flexDirection="column">
          <StatusBadge status="staged" count={status.staged.length} />
          {status.staged.map((f: FileChange) => (
            <FileRow
              key={f.file}
              status={toFileStatus(f.status)}
              file={f.file}
            />
          ))}
        </InkBox>
      )}

      {/* Unstaged */}
      {status.unstaged.length > 0 && (
        <InkBox flexDirection="column">
          <StatusBadge status="unstaged" count={status.unstaged.length} />
          {status.unstaged.map((f: FileChange) => (
            <FileRow
              key={f.file}
              status={toFileStatus(f.status)}
              file={f.file}
              dimmed
            />
          ))}
        </InkBox>
      )}

      {/* Untracked */}
      {status.untracked.length > 0 && (
        <InkBox flexDirection="column">
          <StatusBadge status="untracked" count={status.untracked.length} />
          {status.untracked.map((f: string) => (
            <InkBox key={f}>
              <Text>{"  "}</Text>
              <Text color="#6B7280">{"?"}</Text>
              <Text>{"  "}</Text>
              <Text color="#6B7280">{"untracked  "}</Text>
              <Text color="#6B7280">{f}</Text>
            </InkBox>
          ))}
        </InkBox>
      )}

      {/* Clean state */}
      {isClean && (
        <InkBox marginTop={1}>
          <Text color="#4ADE80">{"  ✓  "}</Text>
          <Text color="#6B7280">{"Working tree clean"}</Text>
        </InkBox>
      )}

      {/* Recent commits */}
      {log.length > 0 && <CommitLog entries={log} />}

      {/* Divider */}
      <InkBox marginTop={1}>
        <Text color="#374151">{"─".repeat(50)}</Text>
      </InkBox>

      {/* Hints */}
      {status.staged.length > 0 && (
        <InkBox flexDirection="column">
          <HintLine
            left={"  git-helper push --ai       "}
            right={"commit & push with AI message"}
          />
          <HintLine
            left={"  git-helper commit-msg      "}
            right={"preview an AI commit message"}
          />
          <HintLine
            left={'  git-helper push "<msg>"    '}
            right={"commit & push with your message"}
          />
          <HintLine
            left={"  git-helper --help       "}
            right={"show help information"}
          />
        </InkBox>
      )}

      {(status.unstaged.length > 0 || status.untracked.length > 0) &&
        status.staged.length === 0 && (
          <HintLine
            left={"  git add .                  "}
            right={"stage all changes first"}
          />
        )}

      {status.behind > 0 && (
        <HintLine
          left={"  git-helper pull            "}
          right={`pull ${status.behind} commit(s) from upstream`}
        />
      )}
    </InkBox>
  );
}

export async function runStatusCommand(): Promise<void> {
  const status = getGitStatus();

  if (!status.isRepo) {
    box(
      "Not a git repository",
      ["Run git init to initialise a repository here."],
      "error",
    );
    process.exit(1);
  }

  const log = getRecentLog(5);
  const { waitUntilExit } = render(
    <StatusDashboard status={status} log={log} />,
  );
  await waitUntilExit();
}
