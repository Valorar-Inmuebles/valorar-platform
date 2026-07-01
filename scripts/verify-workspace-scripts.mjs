#!/usr/bin/env node
/**
 * Ensures workspace packages expose scripts required by `npm run dev` at the monorepo root.
 * Run via `npm run verify:workspace` (also hooked as predev).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredScripts = [
  {
    packagePath: "apps/api/package.json",
    script: "dev",
    expected: "npm run start:dev",
  },
  {
    packagePath: "apps/admin/package.json",
    script: "dev",
  },
  {
    packagePath: "apps/web/package.json",
    script: "dev",
  },
];

let failed = false;

for (const rule of requiredScripts) {
  const filePath = join(root, rule.packagePath);
  let pkg;

  try {
    pkg = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    failed = true;
    console.error(`[verify:workspace] Cannot read ${rule.packagePath}:`, error);
    continue;
  }

  const value = pkg.scripts?.[rule.script];

  if (!value) {
    failed = true;
    console.error(
      `[verify:workspace] Missing scripts.${rule.script} in ${rule.packagePath}`,
    );
    continue;
  }

  if (rule.expected && value !== rule.expected) {
    failed = true;
    console.error(
      `[verify:workspace] ${rule.packagePath} scripts.dev must be "${rule.expected}" (found "${value}")`,
    );
  }
}

if (failed) {
  console.error(
    "\n[verify:workspace] Fix workspace dev scripts before running the monorepo.",
  );
  process.exit(1);
}

console.log("[verify:workspace] Workspace dev scripts OK.");
