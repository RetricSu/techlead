/**
 * SWE-bench 测试集加载器
 * 用于加载和解析 benchmark-5.json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { SWEBenchTestCase, ParsedTestCase } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BENCHMARK_FILE = join(__dirname, "benchmark-5.json");

/**
 * 加载原始 benchmark 数据
 */
export function loadBenchmark(): SWEBenchTestCase[] {
  const content = readFileSync(BENCHMARK_FILE, "utf-8");
  return JSON.parse(content) as SWEBenchTestCase[];
}

/**
 * 解析 instance_id 提取信息
 * 格式: owner__repo-issue_number
 */
function parseInstanceId(instanceId: string): {
  owner: string;
  name: string;
  issueNumber: string;
} {
  const parts = instanceId.split("__");
  if (parts.length !== 2) {
    throw new Error(`Invalid instance_id format: ${instanceId}`);
  }
  const [owner, repoWithIssue] = parts;
  const lastDashIndex = repoWithIssue.lastIndexOf("-");
  if (lastDashIndex === -1) {
    throw new Error(`Invalid instance_id format: ${instanceId}`);
  }
  const name = repoWithIssue.slice(0, lastDashIndex);
  const issueNumber = repoWithIssue.slice(lastDashIndex + 1);
  return { owner, name, issueNumber };
}

/**
 * 加载并解析 benchmark 数据
 */
export function loadParsedBenchmark(): ParsedTestCase[] {
  const tests = loadBenchmark();
  return tests.map((test) => {
    const { owner, name, issueNumber } = parseInstanceId(test.instance_id);
    return {
      ...test,
      failToPass: JSON.parse(test.FAIL_TO_PASS) as string[],
      passToPass: JSON.parse(test.PASS_TO_PASS) as string[],
      owner,
      name,
      issueNumber,
    };
  });
}

/**
 * 根据 instance_id 查找特定测试
 */
export function findTest(instanceId: string): ParsedTestCase | undefined {
  const tests = loadParsedBenchmark();
  return tests.find((t) => t.instance_id === instanceId);
}

/**
 * 按项目分组测试
 */
export function groupByRepo(): Record<string, ParsedTestCase[]> {
  const tests = loadParsedBenchmark();
  const groups: Record<string, ParsedTestCase[]> = {};
  for (const test of tests) {
    if (!groups[test.repo]) {
      groups[test.repo] = [];
    }
    groups[test.repo].push(test);
  }
  return groups;
}

// CLI 直接运行时的输出
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = loadParsedBenchmark();
  console.log(`SWE-bench Verified 测试集 (${tests.length} 个)\n`);
  for (const t of tests) {
    console.log(`📦 ${t.instance_id}`);
    console.log(`   项目: ${t.repo}`);
    console.log(`   难度: ${t.difficulty}`);
    console.log(`   失败测试: ${t.failToPass.length} 个`);
    console.log(`   Commit: ${t.base_commit.slice(0, 12)}...`);
    console.log();
  }
}
