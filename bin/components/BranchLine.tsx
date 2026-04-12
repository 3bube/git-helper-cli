import React from "react";
import { Box as InkBox, Text } from "ink";

interface BranchLineProps {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export function BranchLine({
  branch,
  upstream,
  ahead,
  behind,
}: BranchLineProps): React.JSX.Element {
  return (
    <InkBox flexDirection="column">
      <InkBox marginTop={1}>
        <Text color="#7C6FF7">{"┌─"} </Text>
        <Text bold>{"Branch"}</Text>
      </InkBox>
      <InkBox>
        <Text>{"  "}</Text>
        <Text color="#7C6FF7">{" "} </Text>
        <Text bold>{branch}</Text>
        {upstream !== null ? (
          <Text color="#6B7280">{"  →  " + upstream}</Text>
        ) : (
          <Text color="#6B7280">{"  (no upstream)"}</Text>
        )}
        {ahead > 0 && <Text color="#4ADE80">{`  ↑${ahead}`}</Text>}
        {behind > 0 && <Text color="#FBBF24">{`  ↓${behind}`}</Text>}
      </InkBox>
    </InkBox>
  );
}
