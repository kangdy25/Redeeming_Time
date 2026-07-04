# Context

## Project Environment
- Working directory: `/Users/kangdy25/Programming/Web/Redeeming_Time`
- Codebase type: Django REST Framework backend, React monorepo frontend (web React/Vite app, mobile Expo app, shared library).
- Active API URL: `http://localhost:8000/api`

## Core Modules & Packages
- `redeeming-time-frontend/apps/web`: React/Vite SPA using Tailwind CSS.
- `redeeming-time-frontend/apps/app`: React Native Expo app using NativeWind and Tailwind.
- `redeeming-time-frontend/shared`: Shared library for authentication, API client, Zustand stores, and React Query hooks.
- `redeeming-time-backend`: DRF API.

## Requirements Overview
- Slate dark theme (`#09090B`, zinc-800 borders, `#18181B` cards) for Web Bento Grid.
- Routing via `react-router-dom` in apps/web.
- Overdue tasks rollover action on client-side (via `/api/tasks/` PATCH or agent skills `/api/agent/skills/rollover/`).
- NativeWind single-screen dark dashboard optimized for single-handed thumb navigation.
