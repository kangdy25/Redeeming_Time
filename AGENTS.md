# Repository Guidelines

## Project Structure & Module Organization

This repository contains the Redeeming Time planner implementation plus planning and architecture documentation. Keep project orientation in `README.md`, and detailed specifications in `docs/`.

- `README.md`: product overview, roadmap, intended tech stack, and target directory structure.
- `docs/agent-manifesto.md`: AI sub-agent roles and responsibilities.
- `docs/agent-harness-spec.md`: agent sandbox, hooks, and skills contract.
- `docs/erd.md`: Mermaid ERD for the planner domain model.
- `backend/`: Django REST Framework API, authentication, planner models, and agent harness services.
- `frontend/`: React/Vite web app, Expo app, shared stores, API client, and test harness.

Shared frontend stores, API clients, hooks, and types live under `frontend/shared/`.

## Build, Test, and Development Commands

Use these commands for local validation:

- `rg --files`: inspect tracked project files quickly.
- `cd backend && uv run manage.py test`: run backend Django tests.
- `cd backend && uv run manage.py migrate && uv run manage.py runserver`: run the local API.
- `cd frontend && npm run test`: run the Vitest suite for web, mobile, and shared code.
- `cd frontend && npm run build:web`: typecheck and build the Vite web app.
- `cd frontend && npm run typecheck:app && npm run typecheck:shared`: run Expo/shared TypeScript checks.
- `cd frontend && npm --workspace @redeeming-time/web run dev`: run the Vite web app locally.

## Coding Style & Naming Conventions

Use Markdown headings consistently and keep docs concise. Prefer fenced code blocks for directory trees, shell commands, Mermaid diagrams, and API examples. Preserve established terminology such as `Time-Rescuer`, `Rollover Director`, `Agent-Scoped JWT`, and hook names like `on_task_failed`.

Use descriptive module names aligned with the domain: `calendar`, `category`, `event`, `task`, `agent_harness`, and `rollover`. Keep API and database names snake_case on the Django side.

## Testing Guidelines

The frontend test suite currently covers 104 cases across web, mobile, and shared planner flows. Backend tests cover user creation, planner model relationships, and agent rollover services. For documentation-only changes, verify links, headings, and Mermaid syntax manually. New backend tests should expand DRF permissions, rollover behavior, schedule congestion detection, and ERD-backed model relationships. New frontend tests should cover calendar interactions, task rollover display, shared hooks, and state synchronization.

## Commit & Pull Request Guidelines

Git history currently only contains `Initial commit`, so no detailed convention is established. Use short imperative commit messages such as `Add agent harness specification` or `Document planner ERD`.

Pull requests should include a clear summary, affected files, screenshots for UI work, and verification commands run. Link related issues when available, and call out changes to agent contracts, hooks, permissions, or data models.

## Security & Configuration Tips

Do not commit secrets, OAuth credentials, JWT signing keys, database URLs, or cloud access keys. Agents must interact with planner data through authenticated DRF API endpoints, never direct database access.
