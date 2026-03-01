# TechLead Project Template

## Project Structure

```
.techlead/
├── current.json              # Current task pointer
├── config.yaml               # Project configuration
├── tasks/                    # Task directory
└── knowledge/                # Project knowledge
    ├── pitfalls.md
    └── patterns.md
```

## Quick Start

```bash
# Add a task
techlead add "Your task description"

# View status
techlead status

# Run task (auto-selects next)
techlead run

# Switch to next task
techlead next
```
