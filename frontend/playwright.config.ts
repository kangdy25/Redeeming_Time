import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'uv run manage.py migrate && uv run manage.py flush --noinput && uv run manage.py runserver 127.0.0.1:8000 --noreload',
      cwd: '../backend',
      url: 'http://127.0.0.1:8000/api/schema/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        DEBUG: 'True',
        DATABASE_URL: 'sqlite:////tmp/redeeming-time-e2e.sqlite3',
        EMAIL_BACKEND: 'django.core.mail.backends.filebased.EmailBackend',
        EMAIL_FILE_PATH: '/tmp/redeeming-time-e2e-mail',
        FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      cwd: '.',
      url: 'http://127.0.0.1:5173/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
