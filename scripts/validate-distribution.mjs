#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "website/index.html",
  "website/styles.css",
  "website/app.js",
  ".va-auto-pilot/sprint-state.json",
  "skills/va-auto-pilot/SKILL.md",
  "skills/va-auto-pilot/claude-command.md",
  "scripts/sprint-board.mjs",
  "docs/todo/run-journal.md",
  "templates/.va-auto-pilot/sprint-state.json",
  "templates/scripts/sprint-board.mjs",
  "templates/docs/todo/run-journal.md",
  ".github/workflows/deploy-website.yml",
  "docs/operations/va-auto-pilot-protocol.md"
];

const failures = [];

for (const relative of requiredFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${relative}`);
  }
}

if (fs.existsSync(path.join(root, "website/index.html"))) {
  const html = fs.readFileSync(path.join(root, "website/index.html"), "utf8");
  const checks = [
    { token: 'meta name="github-owner"', label: "github-owner meta" },
    { token: 'id="skillDirLink"', label: "skillDirLink anchor" },
    { token: 'id="skillRawLink"', label: "skillRawLink anchor" },
    { token: 'id="codexInstallCmd"', label: "codex command block" },
    { token: 'id="claudeInstallCmd"', label: "claude command block" }
  ];

  for (const check of checks) {
    if (!html.includes(check.token)) {
      failures.push(`website/index.html missing ${check.label}`);
    }
  }
}

if (fs.existsSync(path.join(root, "skills/va-auto-pilot/SKILL.md"))) {
  const skill = fs.readFileSync(path.join(root, "skills/va-auto-pilot/SKILL.md"), "utf8");
  if (!skill.includes("name: va-auto-pilot")) {
    failures.push("skills/va-auto-pilot/SKILL.md missing expected skill name");
  }
}

if (failures.length > 0) {
  console.error("Distribution validation failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Distribution validation passed.");
