#!/usr/bin/env node

import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getGitCommitId() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function generateVersion() {
  const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

  const versionInfo = {
    version: pkg.version,
    commit: getGitCommitId(),
  };

  const outputPath = join(__dirname, "../src/version.json");
  writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2) + "\n");
  console.log(`Generated version: ${versionInfo.version} (${versionInfo.commit})`);
}

generateVersion();
