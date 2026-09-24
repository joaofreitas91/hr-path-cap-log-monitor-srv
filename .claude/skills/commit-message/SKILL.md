---
name: commit-message
description: Suggest a git commit message for the currently staged changes, following this repository's semantic format (`type(project): message`, lowercase, english). Only generates the message; never runs `git commit` or `git push`. Use whenever the user asks for a commit message, wants to know how to describe their changes, or says things like "sugere uma mensagem de commit", "gera o commit", "como eu commito isso?" or "write a commit message".
---

# Git Commit Message

This skill only writes the message. The user reviews it and commits it themselves, so never run `git commit` or `git push`.

## Steps

1. **Check the working tree**: run `git status` and handle the result:
   - **Nothing staged, nothing modified** (`nothing to commit, working tree clean`): tell the user "No changes found. Please make changes to your files before trying to commit." and stop.
   - **Nothing staged, but modified or untracked files exist**: ask the user (with AskUserQuestion) whether to stage all changes with `git add -A`. If they decline, stop — there is nothing to describe.
   - **Some changes staged, others not**: partial staging is often intentional. Generate the message for the staged changes only, and mention which files were left out of the stage.
   - **Everything staged**: continue.
2. **Read the staged changes**: run `git diff --staged --stat` first to see which files changed and how much, then `git diff --staged` to understand what changed functionally and why. Skip reading the full diff of generated or lock files (e.g. `package-lock.json`); the stat line is enough for those. Make sure the message reflects every staged file, not just the first few.
3. **Check the current branch**: run `git branch --show-current`. If it is `main`, `master`, `dev` or `development`:
   - Tell the user they are committing directly to a mainline branch.
   - Ask (with AskUserQuestion): "You're on the `<branch>` branch. Would you like me to create the branch `<suggested-branch-name>` for this commit?" — see **Branch Naming** below.
   - On confirmation, run `git switch -c <branch-name>` (staged changes carry over). If they decline, continue on the current branch.
4. **Check recent history**: run `git log --format=%s -20` and reuse the same types and scopes.
5. **Write and present the message** following the rules below, using the **Output Format**.

## Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

- **First line**: at most 100 characters in total, counting type and scope. This is a ceiling, not a target: the scope alone takes ~25 characters, and the limit exists so a clear subject never has to be mangled to fit.
- **Subject**: short and to the point — say what changed in a few words (e.g. `rename log access roles`) and leave the details to the body. A subject that tries to explain everything is harder to scan in `git log --oneline`. Use imperative, present tense ("add filter", not "added filter" or "adds filter"), no trailing period. Describe what changed from a functional perspective rather than implementation details.
- **Body** (optional): use it when the subject alone doesn't explain the change — this is where the specifics go (which fields, which roles, before/after). Separate it from the subject with a blank line, write it as bullets (one change per line, at most 6), wrapped at 72 characters.
- **Footer** (optional): issue references such as `closes #123` or `fixes #456`, or `breaking change: ...`.

Style rules for the whole message:

- **English**, even when the conversation is in Portuguese — the whole history is in English.
- **Lowercase only**, including type, scope and acronyms (`odata`, `ui5`, `pt-br`). Refer to code identifiers in plain words (e.g. "matching log ids function") rather than quoting camelCase names.
- **No emojis or gitmojis**, even if requested.
- **No `Co-Authored-By` trailers** or any other attribution — commits should show only the user as the author.

### Commit Types

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation changes
- `style`: formatting only, no change in meaning
- `refactor`: neither fixes a bug nor adds a feature
- `perf`: performance improvement
- `test`: adding or updating tests
- `chore`: build process, dependencies, tooling, translations

### Project Scopes

The scope is required and names the project affected:

| Scope                | Usage                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| `log-monitor-srv`    | CAP service: `db/`, `srv/`, `srv/http/`, `mta.yaml`, `xs-security.json`, root config |
| `log-monitor-report` | UI5 app: `app/log.monitor.report/`                                                   |

- If the changes touch both projects, use the project that drives the change (e.g. a report feature that needs a new service function uses `log-monitor-report`).
- Omit the scope only for repository-wide housekeeping that belongs to no project (e.g. `chore: ignore sqlite shm and wal files`).
- If a new project is added to the repository, follow the same `<project-name>` pattern.

### Examples from this repository

```text
feat(log-monitor-srv): replace user integrations with group-based access control
```

```text
fix(log-monitor-report): wire filter bar clear to reset filters
```

```text
feat(log-monitor-report): filter logs by dynamic integration fields

- read filterable integration fields and render a filter input for each
- add matching log ids function to the report service
- combine matched ids with the standard filters
```

## Branch Naming

Format: `<type>/<task-description>`, where `<type>` is one of the commit types above and `<task-description>` is 3-4 hyphenated words. Be specific rather than generic, derived from the staged changes.

Examples: `feat/filter-logs-by-fields`, `fix/filter-bar-clear-reset`, `chore/translate-labels-pt-br`, `refactor/group-based-access`.

## Output Format

Present the message in a fenced code block so the user can copy it as is, without showing the git command:

````markdown
Here's the suggested commit message based on your staged changes:

```text
<generated commit message>
```
````
