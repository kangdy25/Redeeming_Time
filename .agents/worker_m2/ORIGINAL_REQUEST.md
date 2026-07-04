## 2026-07-04T08:49:01Z
Implement client-side routing and auth redirection using react-router-dom for Milestone 2.

Tasks:
1. Update apps/web/package.json to include "react-router-dom": "^6.28.0" in dependencies.
2. Run npm install from the frontend workspace root (/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend) to install the new dependency.
3. Update apps/web/src/main.tsx to import BrowserRouter and wrap <App /> with it.
4. Refactor apps/web/src/App.tsx:
   - Create LoginPage (rendering AuthPanel) and DashboardPage (rendering dashboard view).
   - Use useAuthStore to handle authentication state and guard routes.
   - Guard /dashboard by redirecting unauthenticated users to /login using Navigate.
   - Guard /login by redirecting authenticated users to /dashboard.
   - Mount routes in App component: /login, /dashboard, and fallback * to /dashboard.
5. Run the web build command to verify it compiles and type-checks successfully: npm --workspace @redeeming-time/web run build
6. Write a detailed handoff.md in your working directory (/Users/kangdy25/Programming/Web/Redeeming_Time/.agents/worker_m2/handoff.md) explaining the changes made, the build command, and output.
