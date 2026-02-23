# va-auto-pilot skill

可分发的 Agent Skill，用来把 VA Auto-Pilot 工程闭环安装到任意代码库。

## 给 Codex

```text
$skill-installer install https://github.com/Vadaski/va-auto-pilot/tree/main/skills/va-auto-pilot
```

安装后重启 Codex，然后可用 `$va-auto-pilot` 显式调用。

## 给 Claude Code

```bash
mkdir -p .claude/commands
curl -fsSL https://raw.githubusercontent.com/Vadaski/va-auto-pilot/main/skills/va-auto-pilot/claude-command.md -o .claude/commands/va-auto-pilot.md
```

之后可直接输入 `/va-auto-pilot`。
