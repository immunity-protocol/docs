---
title: "Skill for AI assistants"
order: 4
description: "Drop the Immunity SKILL.md into your IDE so Claude / Cursor / Codex write idiomatic agent code on the first try."
---

# Skill for AI assistants

The Immunity SDK ships with a packaged **agent skill**, a single `SKILL.md` file an AI coding tool can read to understand the API surface, the empirical gotchas, and the right way to wire `check()` into your agent. It cuts the round-trips needed to get a correct integration on the first try.

The skill is part of [`ophelios-studio/skills`](https://github.com/ophelios-studio/skills), a public repository of empirical skills for any tool implementing the [agentskills.io](https://agentskills.io) spec.

## One command (recommended)

```bash
npx skills add ophelios-studio/skills --skill immunity
```

The CLI installs to `~/.agents/skills/immunity/` and symlinks into your agent's skill directory automatically. Works for Claude Code, Cursor, Codex, Cline, Gemini CLI, and any tool that scans the standard skill paths.

## Or download manually

Pick whichever tool you use:

### Claude Code

```bash
mkdir -p ~/.claude/skills/immunity
curl -fsSL https://raw.githubusercontent.com/ophelios-studio/skills/main/skills/immunity/SKILL.md \
  > ~/.claude/skills/immunity/SKILL.md
```

Restart Claude Code and the skill activates whenever it detects an Immunity context in your project.

### Cursor

```bash
mkdir -p .cursor/rules
curl -fsSL https://raw.githubusercontent.com/ophelios-studio/skills/main/skills/immunity/SKILL.md \
  > .cursor/rules/immunity.mdc
```

Cursor reads `.cursor/rules/*.mdc` per workspace. Add the file to your project root.

### Codex

Paste the SKILL.md verbatim into the system-prompt include of your Codex setup. Most teams keep these under `prompts/skills/immunity.md` and load them at boot.

### Cline / Gemini CLI / others

Drop the file at the standard agentskills path for your tool. Most tools follow the same layout: a per-skill directory with the `SKILL.md` inside, scanned at startup or on workspace change.

## What's in the skill

- The full SDK API surface, every public method, every option, every error class.
- The three-tier lookup walkthrough with concrete latency and cost numbers.
- Configuration table mirrored from the SDK README so the skill stays in sync.
- The five antibody types with real catches drawn from the demo's incident catalog.
- Empirical gotchas: peer-dep flag, AXL-as-separate-daemon, port 5678, TEE key rotation, etc.
- A distilled key-rules checklist your assistant can use as a self-check.

## Why bother

Without the skill, your assistant guesses based on outdated training data, misnames methods, hallucinates options, and writes setup boilerplate that does not match the SDK's actual peer-dep requirements. With the skill in place, code-completion and code-generation produce idiomatic Immunity calls on the first try.

## Source

The skill lives at [github.com/ophelios-studio/skills/blob/main/skills/immunity/SKILL.md](https://github.com/ophelios-studio/skills/blob/main/skills/immunity/SKILL.md). It is updated alongside SDK releases. Pin to a tag in your install if you need stability across SDK upgrades.
