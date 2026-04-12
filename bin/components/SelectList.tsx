import React from "react";
import { Select } from "@inkjs/ui";

interface SelectListProps {
  items: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}

export function SelectList({ items, onSelect }: SelectListProps): React.JSX.Element {
  return <Select options={items} onChange={onSelect} />;
}
