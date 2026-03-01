## 新增功能

### Agent Adapter Lib (`src/lib/agent-adapter.ts`)

统一适配 Claude Code 和 Codex CLI 的库：

```typescript
import { 
  executeAgent, 
  detectAgent, 
  createDefaultConfig 
} from './lib/agent-adapter';

// 自动检测并执行
const config = createDefaultConfig('./project');
const result = executeAgent('Generate plan', config, {
  systemPromptFile: './prompts/plan.md',
  outputFormat: 'json',
  timeoutMs: 60000
});

console.log(result.content);
console.log(`Cost: $${result.costUsd}`);
```

### API

- `isAgentAvailable(provider)` - 检查 CLI 是否安装
- `detectAgent()` - 自动检测可用 agent
- `createDefaultConfig(workingDir)` - 创建默认配置
- `executeAgent(prompt, config, options)` - 同步执行
- `executeAgentAsync(...)` - 异步执行（支持流式输出）

### 特性

- ✅ 支持 Claude Code (`claude -p`)  
- ✅ 支持 Codex CLI (`codex exec`)
- ✅ JSON 结构化输出解析
- ✅ Token 和成本追踪
- ✅ 超时控制
- ✅ 异步流式输出