import React from "react";
import { Box as InkBox, Text } from "ink";

interface StatusBadgeProps {
  status: "staged" | "unstaged" | "untracked";
  count: number;
}

const BADGE_COLOR: Record<StatusBadgeProps["status"], string> = {
  staged: "#4ADE80",
  unstaged: "#FBBF24",
  untracked: "#6B7280",
};

const BADGE_LABEL: Record<StatusBadgeProps["status"], string> = {
  staged: "Staged",
  unstaged: "Unstaged",
  untracked: "Untracked",
};

export function StatusBadge({
  status,
  count,
}: StatusBadgeProps): React.JSX.Element {
  const color = BADGE_COLOR[status];
  const label = BADGE_LABEL[status];

  return (
    <InkBox marginTop={1}>
      <Text color="#7C6FF7">{"┌─"} </Text>
      <Text bold>{label} </Text>
      <Text color={color}>{`(${count})`}</Text>
    </InkBox>
  );
}
