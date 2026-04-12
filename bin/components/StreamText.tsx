import React from "react";
import { Text } from "ink";

interface StreamTextProps {
  text: string;
  delayMs?: number;
  onComplete?: () => void;
}

export function StreamText({
  text,
  delayMs = 8,
  onComplete,
}: StreamTextProps): React.JSX.Element {
  const [displayed, setDisplayed] = React.useState("");

  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onComplete?.();
      }
    }, delayMs);
    return () => clearInterval(id);
  }, [text, delayMs, onComplete]);

  return <Text color="#7C6FF7">{displayed}</Text>;
}
