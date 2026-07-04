# Redeeming Time

> **"Making the best use of the time, because the days are evil." (Ephesians 5:16, ESV)**
>
> A value-driven, AI-agent-orchestrated, production-ready cross-platform calendar and planner service designed to help users actively rescue and reclaim meaning from thoughtlessly drifting time.

---

## 🚀 Project Overview

Redeeming Time is a robust, visually intuitive **'Daily Schedule Planner'** built to be the first thing a user opens in the morning and the companion they rely on all day.

While focusing on the foundational values of schedule management and to-do execution, it preserves life's momentum by automatically rolling over uncompleted tasks to the next day. It delivers powerful data visualizations to audit whether time was spent meaningfully. Furthermore, next-generation AI architecture (Agent Teams, Harness, and Hooks) is deeply integrated into the backend to proactively act as an intelligent time-recovery coach.

### 🎯 Core Planner Values

1. **Visual Intuitiveness:** A layout optimized for absolute glanceability, allowing users to immediately map out tasks and the nature of their commitments through fully tailored custom category colors.
2. **Day-to-Day Continuity:** A seamless integration where schedules and to-dos live organically within a unified calendar view, making the rollover experience of overdue tasks feel natural and non-punitive.
3. **Exceptional Tactile Feedback:** Delivering rapid and snappy interactions across cross-platform environments—supporting smooth drag-and-drop actions and comfortable single-handed mobile navigation.

---

## 🛠 Tech Stack

### Front-end (Cross-Platform Two-Track Workspace)

- **Web:** React 19 (Vite) + Tailwind CSS (A lightweight, blazing-fast desktop planning dashboard)
- **App:** React Native (Expo) + NativeWind (100% sharing styling source patterns with web)
- **State & Fetch:** Zustand + TanStack Query v5 (Shared global caching engine and unified custom Hooks)

### Back-end & Database

- **Framework:** Python / Django REST Framework (DRF)
- **Database:** PostgreSQL (Leveraging Django ORM for highly optimized time-series ranges and aggregation queries)
- **Authentication:** JWT (JSON Web Token), Social Identity Providers (Google, Kakao OAuth 2.0)

### Infrastructure

- **Web Hosting:** Vercel (React Web)
- **API Server & Storage:** AWS (EC2 / RDS PostgreSQL / S3 for asset management)

---

## 🤖 AI Agent Systems Architecture (AI Orchestration)

Going beyond simple text generation, this ecosystem builds an internal AI agent infrastructure organically woven into the backend business logic.

- **Agent Harness:** A secure, sandboxed execution framework that isolates agents, restricting data access strictly to authenticated API communication layers.
- **Agent Skills:** Granular function/tool specifications allowing agents to perform analytics lookups or translate natural language requests into schema-compliant event strings.
- **System Hooks:** Event-driven neural triggers (e.g., detecting uncompleted tasks at midnight or scheduling overloads) that wake up specific sub-agents.
- **Teams & Sub-agents:** A specialized, collaborating workforce consisting of the `Time-Rescuer` (balance coach), `Rollover Director` (overdue task secretary), and `Developer Agent` (automated full-stack engineer).

---

## ✨ Feature Roadmap

### Stage 1: Core Planner MVP (Minimum Viable Product)

- [ ] **Authentication (Auth):** Custom registration/login with JWT alongside OAuth 2.0 (Google, Kakao).
- [ ] **Multi-Calendar:** Creating and switching between isolated planner spaces tailored for distinct scopes (Personal, Team, Routine).
- [ ] **Event & Task CRUD:** Complete create, read, update, delete workflows for calendar events and to-dos, including deep note nesting.
- [ ] **Custom Category (`CATEGORY`):** A flexible, separated category entity mapping custom titles and hex color codes.

### Stage 2: Collaboration & Access Control

- [ ] **Calendar Sharing:** Generation of private invite links and shared workspace enrollment.
- [ ] **Fine-Grained Permissions:** Hard separation of `OWNER`, `EDITOR`, and `VIEWER` access matrix backed by rigid DRF Permission classes.
- [ ] **Event Feeds:** Real-time conversational comments and activity logs bound to specific calendar events.

### Stage 3: Productivity & Automation (AI Hook Integrations)

- [ ] **Recurrence Engine:** Server-side handling of complex recurring rules mapped to the RFC 5545 (RRule) specification.
- [ ] **Automated Task Rollover:** A batch workflow that automatically forwards uncompleted tasks past midnight, triggering the `TaskFailedHook`.
- [ ] **Unified Deep Search:** High-speed tokenized searching across titles, tags, and attendees.

### Stage 4: Proactive Time Analytics (Dashboard)

- [ ] **Time Consumption Analysis:** Ultra-fast calculation of total durations and category percentages using DRF `annotate` and `aggregate` pipelines.
- [ ] **Milestone Reports:** Aggregating weekly/monthly achievement trends with analytical reviews generated by the `Time-Rescuer Agent`.

---

## 📁 Directory Structure

```text
├── backend/                   # Django DRF API Service
└── frontend/                  # Frontend Monorepo Workspace
    ├── web/                  # React + Vite + Tailwind CSS (Desktop Web Planner)
    ├── app/                  # React Native + NativeWind (Mobile App Planner)
    └── shared/               # Shared Zustand Stores & TanStack Query Custom Hooks
```
