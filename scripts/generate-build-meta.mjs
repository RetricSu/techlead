#!/usr/bin/env node

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getCommitId() {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function generateBuildMeta() {
  const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
  const distDir = join(__dirname, "../dist");
  const outputPath = join(distDir, "build-meta.json");

  const buildMeta = {
    version: pkg.version,
    commit: getCommitId(),
  };

  mkdirSync(distDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(buildMeta, null, 2), "utf-8");
  console.log(
    `Generated dist/build-meta.json: ${buildMeta.version} (${buildMeta.commit ?? "no-commit"})`
  );
}

generateBuildMeta();
