import React from "react";
import { render, useApp, Box as InkBox, Text } from "ink";
import { Select } from "@inkjs/ui";
import { AVAILABLE_MODELS } from "../constants/index.js";
import { loadConfig } from "../utils/index.js";
import { runConfigSync, setProjectValue, setGlobalValue } from "../config.js";
import { Panel } from "../components/Panel.js";
import type { ConfigOptions, Config } from "../types/index.js";

// ── Model picker component ────────────────────────────────────────────────────

type PickerPhase = "selecting" | "done" | "error";

interface ModelPickerFlowProps {
  scope: "project" | "global";
  onError: () => void;
}

function ModelPickerFlow({
  scope,
  onError,
}: ModelPickerFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [phase, setPhase] = React.useState<PickerPhase>("selecting");
  const [selected, setSelected] = React.useState<string | null>(null);
  const current = loadConfig().model;

  const options = AVAILABLE_MODELS.map((m) => ({
    label:
      `${m.id === current ? "● " : "  "}` +
      `${m.id}  —  ${m.description}  (${m.speed})`,
    value: m.id,
  }));

  const handleSelect = React.useCallback(
    (value: string) => {
      try {
        const setter: (key: keyof Config, value: string) => void =
          scope === "project" ? setProjectValue : setGlobalValue;
        setter("model", value);
        setSelected(value);
        setPhase("done");
        setTimeout(() => exit(), 0);
      } catch {
        setPhase("error");
        onError();
        setTimeout(() => exit(), 0);
      }
    },
    [scope, exit, onError],
  );

  if (phase === "done") {
    return (
      <Panel
        variant="success"
        title="Model saved"
        lines={[
          `${scope === "project" ? "Project" : "Global"} model set to:`,
          `  ${selected ?? ""}`,
        ]}
      />
    );
  }

  if (phase === "error") {
    return (
      <Panel variant="error" title="Failed to save model" lines={[]} />
    );
  }

  return (
    <InkBox flexDirection="column">
      <InkBox marginBottom={1}>
        <Text color="#7C6FF7">{"┌─ "}</Text>
        <Text bold>{`Select model  `}</Text>
        <Text color="#6B7280">{`(${scope})  current: `}</Text>
        <Text color="#7C6FF7">{current}</Text>
      </InkBox>
      <Select options={options} onChange={handleSelect} />
      <InkBox marginTop={1}>
        <Text color="#6B7280">{"  ↑ ↓ navigate   Enter select   Esc cancel"}</Text>
      </InkBox>
    </InkBox>
  );
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function runConfigCommand(options: ConfigOptions): Promise<void> {
  if (options.model) {
    let failed = false;
    const { waitUntilExit } = render(
      <ModelPickerFlow
        scope="project"
        onError={() => {
          failed = true;
        }}
      />,
    );
    await waitUntilExit();
    if (failed) process.exit(1);
    return;
  }

  if (options.globalModel) {
    let failed = false;
    const { waitUntilExit } = render(
      <ModelPickerFlow
        scope="global"
        onError={() => {
          failed = true;
        }}
      />,
    );
    await waitUntilExit();
    if (failed) process.exit(1);
    return;
  }

  // All non-interactive options handled by the original sync implementation
  runConfigSync(options);
}
