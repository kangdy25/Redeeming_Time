import { expect, test } from '@playwright/test';

test('회원가입부터 워크스페이스, 일정, 할일 생성까지 동작한다', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: '회원가입 Register' }).click();
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill('E2E 사용자');
  await page.getByLabel('비밀번호').fill('e2e-secure-password');
  await page.getByRole('button', { name: 'Create & Connect' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: /1개 워크스페이스/ })).toBeVisible();
  await page.getByRole('button', { name: /1개 워크스페이스/ }).click();
  await page.getByRole('button', { name: '워크스페이스 만들기' }).click();
  await page.getByLabel('Workspace name').fill('E2E 업무');
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await expect(page.getByRole('button', { name: /2개 워크스페이스/ })).toBeVisible();

  await page.locator('.date-cell:not(.muted-cell)').first().click();
  await page.getByRole('textbox', { name: 'Event', exact: true }).fill('E2E 집중 일정');
  await page.getByRole('button', { name: 'Add Event' }).click();
  await expect(page.getByText('E2E 집중 일정')).toBeVisible();

  await page.getByRole('button', { name: /할일 보드/ }).click();
  await page.getByRole('textbox', { name: 'Quick Task', exact: true }).fill('E2E 할일');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.getByText('E2E 할일')).toBeVisible();
});

test('잘못된 로그인 오류를 사용자에게 표시한다', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('missing@example.com');
  await page.getByLabel('비밀번호').fill('wrong-password');
  await page.getByRole('button', { name: 'Connect' }).click();

  await expect(page.locator('.form-message')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
