# Detailed Implementation Plan

## Milestone 2: Web Routing & Auth Redirection
- **Step 2.1**: Dispatch `teamwork_preview_explorer` to analyze how to restructure `apps/web/src/App.tsx` and `main.tsx` for React Router integration, route protection, and token storage.
- **Step 2.2**: Dispatch `teamwork_preview_worker` to install `react-router-dom` in `apps/web`, implement `/login` and `/dashboard` routes, add navigation redirects, and check that the web app builds.
- **Step 2.3**: Dispatch `teamwork_preview_reviewer` to check code quality, types, and build status.
- **Step 2.4**: Dispatch `teamwork_preview_auditor` to audit integrity of the routing and auth logic.

## Milestone 3: Web Bento Grid Dashboard
- **Step 3.1**: Dispatch `teamwork_preview_explorer` to design layout component structure (Bento grid), CSS changes for slate dark theme, neon badges, calendar tabs, and outer glow for schedule congestion.
- **Step 3.2**: Dispatch `teamwork_preview_worker` to implement dashboard UI updates, CSS styling, bento cards, neon styling, tabs, and congestion logic.
- **Step 3.3**: Dispatch `teamwork_preview_reviewer` to review UI, types, and build status.
- **Step 3.4**: Dispatch `teamwork_preview_auditor` to perform integrity audit of the dashboard.

## Milestone 4: Translucent Glassmorphic Rollover Shield
- **Step 4.1**: Dispatch `teamwork_preview_explorer` to identify task list integration points, glassmorphic styling approach, and rollover action flow (using individual PATCH or agent skills endpoint).
- **Step 4.2**: Dispatch `teamwork_preview_worker` to implement Rollover Shield component, styling, and action triggers.
- **Step 4.3**: Dispatch `teamwork_preview_reviewer` to verify the state update, component layout, and build.
- **Step 4.4**: Dispatch `teamwork_preview_auditor` to perform integrity audit of the Rollover Shield.

## Milestone 5: Mobile App Dark UI
- **Step 5.1**: Dispatch `teamwork_preview_explorer` to examine NativeWind setup in `apps/app`, current mobile layout, and design optimized bottom-oriented layout.
- **Step 5.2**: Dispatch `teamwork_preview_worker` to implement NativeWind-styled dark mobile dashboard and navigation.
- **Step 5.3**: Dispatch `teamwork_preview_reviewer` to verify compilation, linting, and typecheck.
- **Step 5.4**: Dispatch `teamwork_preview_auditor` to perform integrity audit of the mobile app layout.

## Milestone 6: E2E Test Pass & Adversarial Hardening
- **Step 6.1**: Poll for `TEST_READY.md` from the E2E Testing Track.
- **Step 6.2**: Run E2E tests across Web and Mobile, diagnose failures.
- **Step 6.3**: Dispatch Worker/Reviewer to fix failures.
- **Step 6.4**: Run Tier 5 adversarial coverage hardening and perform final forensic audit.
