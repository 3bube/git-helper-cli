import React from "react";
import { Box as InkBox, Text } from "ink";

interface PanelProps {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  lines: string[];
}

const VARIANT_COLOR: Record<PanelProps["variant"], string> = {
  info: "#7C6FF7",
  success: "#4ADE80",
  error: "#F87171",
  warning: "#FBBF24",
};

export function Panel({ variant, title, lines }: PanelProps): React.JSX.Element {
  const color = VARIANT_COLOR[variant];

  return (
    <InkBox
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      marginY={0}
    >
      <Text bold color={color}>
        {title}
      </Text>
      {lines.length > 0 && (
        <InkBox flexDirection="column" marginTop={0}>
          {lines.map((line, i) => (
            <Text key={i} color="#6B7280">
              {line}
            </Text>
          ))}
        </InkBox>
      )}
    </InkBox>
  );
}
