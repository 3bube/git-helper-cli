import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import updateNotifier from "update-notifier";
import { box } from "./ui.js";

const DAY_MS = 1000 * 60 * 60 * 24;

export function readPkg(): { name: string; version: string } {
  const pkgPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../package.json",
  );
  return JSON.parse(readFileSync(pkgPath, "utf8")) as {
    name: string;
    version: string;
  };
}

export function checkForUpdates(pkg: { name: string; version: string }): void {
  if (!process.stdout.isTTY || process.env["CI"]) return;

  const notifier = updateNotifier({ pkg, updateCheckInterval: DAY_MS });
  const update = notifier.update;
  if (!update || update.latest === update.current) return;

  process.on("exit", () => {
    box(
      "Update available",
      [`${update.current} → ${update.latest}`, `Run: npm i -g ${pkg.name}`],
      "info",
    );
  });
}
