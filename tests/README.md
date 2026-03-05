# TechLead 测试指南

## 目录结构

```
tests/
├── unit/           # 单元测试 - 测试单个模块/函数
├── integration/    # 集成测试 - 测试模块间交互
└── e2e/            # E2E 测试 - 测试完整工作流
```

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定分类
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# 覆盖率报告
pnpm test:coverage

# 监听模式
pnpm test:watch
```

## 编写测试原则

1. **单元测试**: Mock 外部依赖，测试单一职责
2. **集成测试**: 测试真实交互，允许临时目录 IO
3. **E2E 测试**: 测试完整用户场景

## 覆盖率阈值

- Lines: 55% (目标 70%+)
- Functions: 75% (目标 80%+)
- Branches: 60% (目标 70%+)
- Statements: 55% (目标 70%+)

目标：随时间逐步提高阈值至 80%+

## 当前覆盖情况

运行 `pnpm test:coverage` 查看详细报告。

主要覆盖缺口：
- `src/cli.ts` - CLI 入口（需 E2E 测试覆盖）
- `src/lib/core/commands.ts` - 命令逻辑（部分被集成测试覆盖）
- `src/lib/core/watch.ts` - 文件监听
