/**
 * SWE-bench Verified 测试用例类型定义
 * @see https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified
 */

export interface SWEBenchTestCase {
  /** 唯一标识符，格式: repo__repo-issue_number */
  instance_id: string;

  /** 仓库地址，格式: owner/repo */
  repo: string;

  /** 修复前的 base commit hash */
  base_commit: string;

  /** 环境设置 commit hash */
  environment_setup_commit: string;

  /** 修复补丁（ground truth） */
  patch: string;

  /** 测试补丁 */
  test_patch: string;

  /** 问题描述（GitHub issue body） */
  problem_statement: string;

  /** 提示信息（可能为空） */
  hints_text: string;

  /** 创建时间 */
  created_at: string;

  /** 版本 */
  version: string;

  /** 修复前失败的测试列表（JSON 数组字符串） */
  FAIL_TO_PASS: string;

  /** 修复前通过的测试列表（JSON 数组字符串） */
  PASS_TO_PASS: string;

  /** 难度评估: "<15 min fix" | "15 min - 1 hour" | ... */
  difficulty: string;
}

/** 解析后的测试信息 */
export interface ParsedTestCase extends SWEBenchTestCase {
  /** 解析后的 FAIL_TO_PASS */
  failToPass: string[];

  /** 解析后的 PASS_TO_PASS */
  passToPass: string[];

  /** 仓库所有者 */
  owner: string;

  /** 仓库名 */
  name: string;

  /** issue 编号 */
  issueNumber: string;
}
