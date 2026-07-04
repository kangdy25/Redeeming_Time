# ⚙️ Agent Harness Specification (Agent Harness Spec)

This document defines the technical specifications for the isolated execution environment (Harness), accessible tools (Skills), and event triggers (Hooks) required for AI sub-agents to securely interact with the 'Redeeming Time' system.

---

## 1. Agent Harness

The Agent Harness is a control framework ensuring that AI agents operate safely within a secure and sandboxed environment.

- **Security Guidelines (Sandbox):**
  - Agents are strictly prohibited from executing raw SQL queries or directly accessing the PostgreSQL database.
  - All data queries and manipulations must be performed exclusively through the **Django REST Framework (DRF) API endpoints** provided by the backend.
- **Authentication & Authorization:**
  - When calling APIs, agents must use a dedicated, system-issued **Agent-Scoped JWT** token to clear authentication and authorization layers.

---

## 2. System Hooks

System Hooks are neural trigger interfaces that wake up sleeping AI sub-agents when specific business events occur within the planner service.

| Hook Name               | Trigger Condition                                                                                                   | Target Agent          | Context Data Provided                                         |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------ | :-------------------- | :------------------------------------------------------------ |
| `on_task_failed`        | Every midnight (00:00), when tasks with `is_completed=False` and `target_date < Today` are detected.                | **Rollover Director** | List of overdue tasks, target User's `calendar_id`            |
| `on_schedule_congested` | When a user creates/updates an event, and the total duration for a single day exceeds 8 hours or 3+ events overlap. | **Time-Rescuer**      | List of overlapping event data, user schedule density metrics |
| `on_routine_broken`     | When an event marked as a continuous routine (Habit) milestone is cancelled or left uncompleted.                    | **Time-Rescuer**      | Routine milestone records, consecutive failed days count      |

---

## 3. Agent Skills

Skills are specifications of 'functions/tools' that agents can execute within the harness environment to manage the user's planner. Every skill internally invokes a corresponding DRF API.

### 🛠️ Time-Rescuer Skills

- `fetch_calendar_analytics(user_id, period)`
  - **Description:** Retrieves aggregated time consumption and ratio metrics grouped by `CATEGORY` via DRF aggregation queries.
- `analyze_schedule_density(user_id, date)`
  - **Description:** Computes and returns time gaps and congestion density for a specific date's timeline.

### 🛠️ Rollover Director Skills

- `get_overdue_tasks(calendar_id)`
  - **Description:** Queries the list of tasks that have passed their deadline but remain uncompleted.
- `execute_task_rollover(task_ids, new_date)`
  - **Description:** Bulk updates the `target_date` of selected tasks to the specified new date.
- `adjust_task_priority(task_id, new_priority)`
  - **Description:** Adjusts the priority level or injects warning tags for tasks experiencing recurring rollovers.
