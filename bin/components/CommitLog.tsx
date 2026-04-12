import React from "react";
import { Box as InkBox, Text } from "ink";
import type { GitLog } from "../types/index.js";

interface CommitLogProps {
  entries: GitLog[];
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export function CommitLog({ entries }: CommitLogProps): React.JSX.Element {
  return (
    <InkBox flexDirection="column">
      <InkBox marginTop={1}>
        <Text color="#7C6FF7">{"┌─"} </Text>
        <Text bold>{"Recent commits"}</Text>
      </InkBox>
      {entries.map((entry) => (
        <InkBox key={entry.hash}>
          <Text>{"  "}</Text>
          <Text color="#6B7280">{entry.shortHash}</Text>
          <Text>{"  "}</Text>
          <Text color="#ffffff">{truncate(entry.message, 52)}</Text>
          <Text>{"  "}</Text>
          <Text color="#6B7280">{entry.date}</Text>
        </InkBox>
      ))}
    </InkBox>
  );
}
