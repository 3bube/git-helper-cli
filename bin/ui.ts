import chalk, { type ChalkInstance } from "chalk";

export const c = {
  primary: chalk.hex("#7C6FF7"),
  success: chalk.hex("#4ADE80"),
  warning: chalk.hex("#FBBF24"),
  danger: chalk.hex("#F87171"),
  muted: chalk.hex("#6B7280"),
  dim: chalk.hex("#374151"),
  white: chalk.white,
  bold: chalk.bold,
};

export function box(
  title: string,
  lines: string[],
  variant: "info" | "success" | "error" | "warning" = "info",
): void {
  const variantColor = {
    info: c.primary,
    success: c.success,
    error: c.danger,
    warning: c.warning,
  }[variant];

  const width = Math.max(
    title.length + 4,
    ...lines.map((l) => stripAnsi(l).length + 6),
    50,
  );
  const top = variantColor("╭" + "─".repeat(width - 2) + "╮");
  const bottom = variantColor("╰" + "─".repeat(width - 2) + "╯");
  const titleLine =
    variantColor("│") +
    " " +
    variantColor(chalk.bold(title)) +
    " ".repeat(width - title.length - 3) +
    variantColor("│");

  console.log(top);
  console.log(titleLine);
  console.log(variantColor("│" + "─".repeat(width - 2) + "│"));
  for (const line of lines) {
    const visLen = stripAnsi(line).length;
    const pad = " ".repeat(Math.max(0, width - visLen - 6));
    console.log(
      variantColor("│") + "  " + line + pad + "  " + variantColor("│"),
    );
  }
  console.log(bottom);
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function badge(
  label: string,
  value: string,
  color: ChalkInstance = c.primary,
): string {
  return color.bold(` ${label} `) + c.muted(value);
}

// ── Streamed AI output (typewriter effect) ────────────────────────────────────
export async function streamText(text: string, delayMs = 8): Promise<void> {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delayMs);
  }
  process.stdout.write("\n");
}

// ── Section header ────────────────────────────────────────────────────────────
export function header(text: string): void {
  console.log("\n" + c.primary("┌─") + " " + c.bold(text));
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function divider(): void {
  console.log(c.dim("─".repeat(50)));
}

// ── Key/value row ─────────────────────────────────────────────────────────────
export function kv(key: string, value: string): string {
  return `  ${c.muted(key.padEnd(18))} ${value}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip ANSI escape codes for length calculation */
export function stripAnsi(str: string): string {
  return str.replace(/\u001B\[[0-9;]*m/g, "");
}
