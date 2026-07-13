# Repository Guidelines

## Project Structure & Module Organization

This repository contains the Redeeming Time planner implementation plus planning and architecture documentation. Keep project orientation in `README.md`, and detailed specifications in `docs/`.

- `README.md`: product overview, roadmap, intended tech stack, and target directory structure.
- `docs/erd.md`: Mermaid ERD for the planner domain model.
- `backend/`: Django REST Framework API, authentication, and planner models.
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

Use Markdown headings consistently and keep docs concise. Prefer fenced code blocks for directory trees, shell commands, Mermaid diagrams, and API examples.

Use descriptive module names aligned with the domain: `calendar`, `category`, `event`, `task`, and `rollover`. Keep API and database names snake_case on the Django side.

## Testing Guidelines

The frontend test suite covers web, mobile, and shared planner flows. Backend tests cover user creation and planner model relationships. For documentation-only changes, verify links, headings, and Mermaid syntax manually. New backend tests should expand DRF permissions, rollover behavior, schedule congestion detection, and ERD-backed model relationships. New frontend tests should cover calendar interactions, task rollover display, shared hooks, and state synchronization.

## Commit & Pull Request Guidelines

Use short imperative commit messages such as `Add calendar permissions` or `Document planner ERD`.

Pull requests should include a clear summary, affected files, screenshots for UI work, and verification commands run. Link related issues when available, and call out changes to permissions or data models.

## Security & Configuration Tips

Do not commit secrets, OAuth credentials, JWT signing keys, database URLs, or cloud access keys. External integrations must interact with planner data through authenticated DRF API endpoints, never direct database access.
