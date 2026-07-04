# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains planning and architecture documentation for Redeeming Time. Keep project orientation in `README.md`, and detailed specifications in `docs/`.

- `README.md`: product overview, roadmap, intended tech stack, and target directory structure.
- `docs/agent-manifesto.md`: AI sub-agent roles and responsibilities.
- `docs/agent-harness-spec.md`: agent sandbox, hooks, and skills contract.
- `docs/erd.md`: Mermaid ERD for the planner domain model.

When implementation begins, follow the README layout: `backend/` for the Django REST Framework API and `frontend/` for the React/Vite and Expo workspace. Shared frontend stores and hooks should live under `frontend/shared/`.

## Build, Test, and Development Commands

No runnable application or package manager configuration is committed yet. Until implementation directories are added, validate documentation changes with:

- `rg --files`: inspect tracked project files quickly.
- `git diff -- README.md docs AGENTS.md`: review documentation edits before committing.

Once backend and frontend directories are scaffolded, document exact local commands, for example `npm run dev` for Vite/Expo or `python manage.py test` for Django.

## Coding Style & Naming Conventions

Use Markdown headings consistently and keep docs concise. Prefer fenced code blocks for directory trees, shell commands, Mermaid diagrams, and API examples. Preserve established terminology such as `Time-Rescuer`, `Rollover Director`, `Agent-Scoped JWT`, and hook names like `on_task_failed`.

For future code, use descriptive module names aligned with the domain: `calendar`, `category`, `event`, `task`, `agent_harness`, and `rollover`. Keep API and database names snake_case on the Django side.

## Testing Guidelines

There is no test suite yet. For documentation-only changes, verify links, headings, and Mermaid syntax manually. Future backend tests should cover DRF permissions, rollover behavior, schedule congestion detection, and ERD-backed model relationships. Future frontend tests should cover calendar interactions, task rollover display, shared hooks, and state synchronization.

## Commit & Pull Request Guidelines

Git history currently only contains `Initial commit`, so no detailed convention is established. Use short imperative commit messages such as `Add agent harness specification` or `Document planner ERD`.

Pull requests should include a clear summary, affected files, screenshots for UI work, and verification commands run. Link related issues when available, and call out changes to agent contracts, hooks, permissions, or data models.

## Security & Configuration Tips

Do not commit secrets, OAuth credentials, JWT signing keys, database URLs, or cloud access keys. Agents must interact with planner data through authenticated DRF API endpoints, never direct database access.
