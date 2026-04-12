import React from "react";
import { Box as InkBox, Text } from "ink";
import { ConfirmInput } from "@inkjs/ui";
import { icon } from "./icons.js";

interface ConfirmPromptProps {
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPrompt({
  message,
  danger,
  onConfirm,
  onCancel,
}: ConfirmPromptProps): React.JSX.Element {
  return (
    <InkBox flexDirection="column">
      <InkBox marginBottom={1}>
        <Text color="#7C6FF7">{icon.confirm} </Text>
        <Text color={danger ? "#F87171" : "#E5E7EB"}>{message}</Text>
      </InkBox>
      <InkBox>
        <Text color="#6B7280">{"  "}</Text>
        <ConfirmInput
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </InkBox>
    </InkBox>
  );
}
