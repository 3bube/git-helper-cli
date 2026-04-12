import React from "react";
import { Box as InkBox, Text } from "ink";
import { FileStatus } from "../types/index.js";
import { STATUS_ICON, STATUS_COLOR } from "../utils/index.js";

interface FileRowProps {
  status: FileStatus;
  file: string;
  dimmed?: boolean;
}

export function FileRow({
  status,
  file,
  dimmed = false,
}: FileRowProps): React.JSX.Element {
  const icon = STATUS_ICON[status];
  const iconColor = STATUS_COLOR[status];
  const fileColor = dimmed ? "#6B7280" : "#ffffff";

  return (
    <InkBox>
      <Text>{"  "}</Text>
      <Text color={iconColor}>{icon}</Text>
      <Text>{"  "}</Text>
      <Text color={iconColor}>{status.padEnd(10)}</Text>
      <Text>{"  "}</Text>
      <Text color={fileColor}>{file}</Text>
    </InkBox>
  );
}
