# SWE-bench Verified 测试集

这是从 [SWE-bench Verified](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified) 数据集挑选的5个基础测试用例，用于验证 techlead CLI 的 agent 自动化修复能力。

## 如何运行测试

### 1. 快速预览（不实际修复）

```bash
# 加载并显示测试集信息
npx tsx tests/swe-bench/loader.ts
```

### 2. 准备测试环境

```bash
# 准备单个测试的环境（克隆仓库、应用 test_patch）
npx tsx tests/swe-bench/runner.ts --instance sympy__sympy-13480 --prepare-only

# 工作目录会保留在 tmp-e2e-run/sympy__sympy-13480/
ls tmp-e2e-run/sympy__sympy-13480/
```

### 3. 使用 techlead 自动修复

```bash
# 运行单个测试
npx tsx tests/swe-bench/runner.ts --instance sympy__sympy-13480

# 运行全部5个测试
npx tsx tests/swe-bench/runner.ts --all
```

### 4. 手动测试流程（如果你想自己控制）

```bash
# 1. 准备环境
npx tsx tests/swe-bench/runner.ts --instance sympy__sympy-13480 --prepare-only

# 2. 进入工作目录
cd tmp-e2e-run/sympy__sympy-13480

# 3. 初始化 techlead（如果还没初始化）
techlead init

# 4. 创建任务
techlead add "Fix sympy-13480: coth variable name typo"

# 5. 查看问题描述
cat tests/swe-bench/benchmark-5.json | npx tsx -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
const t = data.find(x => x.instance_id === 'sympy__sympy-13480');
console.log(t.problem_statement);
"

# 6. 运行 techlead loop 自动修复
techlead loop --max-cycles 10 --max-no-progress 3

# 7. 验证修复
python -m pytest sympy/functions/elementary/tests/test_hyperbolic.py::test_coth -v
```

## 测试流程说明

runner 的工作流程：

1. **克隆仓库** → 克隆到 `base_commit`
2. **应用 test_patch** → 添加新的测试用例
3. **验证问题存在** → 运行 `FAIL_TO_PASS` 测试，确认它们失败
4. **创建 techlead 任务** → 用 `problem_statement` 作为任务描述
5. **运行 techlead loop** → 让 agent 自动修复
6. **验证修复** → 再次运行测试，确认通过
7. **回归测试** → 运行部分 `PASS_TO_PASS` 测试，确保没破坏其他功能

## 测试用例列表

| ID | 项目 | 难度 | 问题类型 |
|----|------|------|---------|
| django__django-10999 | django/django | <15 min | 正则表达式修复 |
| matplotlib__matplotlib-24149 | matplotlib/matplotlib | <15 min | 异常处理 |
| pylint-dev__pylint-6386 | pylint-dev/pylint | 15 min - 1 hour | CLI参数处理 |
| scikit-learn__scikit-learn-10908 | scikit-learn/scikit-learn | 15 min - 1 hour | 状态检查 |
| sympy__sympy-13480 | sympy/sympy | <15 min | 变量名拼写错误 |

## 数据结构

每个测试用例包含以下字段：

- `instance_id`: 唯一标识符
- `repo`: 仓库地址
- `base_commit`: 修复前的 commit hash
- `patch`: 修复补丁（ground truth）
- `test_patch`: 测试补丁
- `problem_statement`: 问题描述
- `hints_text`: 提示信息（可能为空）
- `FAIL_TO_PASS`: 失败的测试列表
- `PASS_TO_PASS`: 需要保持通过的测试列表

## 使用方法

```typescript
import { loadBenchmark } from './loader';

const tests = loadBenchmark(); // 加载全部5个测试
```

## 数据来源

```python
from datasets import load_dataset
ds = load_dataset('princeton-nlp/SWE-bench_Verified', split='test')
```

原始 AI 推荐的 5 个 ID 中有 2 个在 Verified 数据集中不存在：
- `django__django-11001` → 替换为 `django__django-10999`
- `pylint-dev__pylint-5856` → 替换为 `pylint-dev__pylint-6386`
