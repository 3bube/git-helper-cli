import React from "react";
import { Spinner as InkSpinner } from "@inkjs/ui";

interface SpinnerLineProps {
  text: string;
}

export function SpinnerLine({ text }: SpinnerLineProps): React.JSX.Element {
  return <InkSpinner label={text} />;
}
