import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const emailInboxPath = '/tmp/redeeming-time-e2e-mail';

function emailBody(message: string) {
  const [headers, body = ''] = message.split(/\r?\n\r?\n/, 2);
  if (/Content-Transfer-Encoding: base64/i.test(headers)) {
    return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  }
  return body;
}

async function getVerificationUrl(recipient: string) {
  await expect
    .poll(
      async () => {
        const files = await readdir(emailInboxPath);
        const messages = await Promise.all(
          files.map(async (file) => readFile(join(emailInboxPath, file), 'utf8')),
        );
        const message = messages.find((candidate) => candidate.includes(`To: ${recipient}`));
        return emailBody(message ?? '').match(
          /http:\/\/127\.0\.0\.1:5173\/verify-email\?token=[^\s]+/,
        )?.[0];
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();

  const files = await readdir(emailInboxPath);
  const messages = await Promise.all(
    files.map(async (file) => readFile(join(emailInboxPath, file), 'utf8')),
  );
  const message = messages.find((candidate) => candidate.includes(`To: ${recipient}`));
  const verificationUrl = emailBody(message ?? '').match(
    /http:\/\/127\.0\.0\.1:5173\/verify-email\?token=[^\s]+/,
  )?.[0];
  if (!verificationUrl) throw new Error('Verification email was not written to the E2E mailbox.');
  return verificationUrl;
}

test('회원가입부터 워크스페이스, 일정, 할일 생성까지 동작한다', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: '회원가입 Register' }).click();
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill('E2E 사용자');
  await page.getByLabel('비밀번호').fill('e2e-secure-password');
  await page.getByRole('button', { name: 'Create & Connect' }).click();

  await expect(
    page.getByText('인증 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.'),
  ).toBeVisible();
  await page.goto(await getVerificationUrl(email));
  await expect(
    page.getByText('이메일 인증이 완료되었습니다. 이제 로그인할 수 있어요.'),
  ).toBeVisible();
  await page.getByRole('link', { name: '로그인으로 이동' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByLabel('비밀번호').fill('e2e-secure-password');
  await page.getByRole('button', { name: 'Connect' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: /1개 워크스페이스/ })).toBeVisible();
  await page.getByRole('button', { name: /1개 워크스페이스/ }).click();
  await page.getByRole('button', { name: '워크스페이스 만들기' }).click();
  await page.getByLabel('Workspace name').fill('E2E 업무');
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await expect(page.getByRole('button', { name: /2개 워크스페이스/ })).toBeVisible();

  const firstCalendarDate = page.locator('.date-cell:not(.muted-cell)').first();
  await firstCalendarDate.getByRole('button', { name: /일정 보기$/ }).click();
  const dailyScheduleDialog = page.getByRole('dialog', { name: /일정$/ });
  await expect(dailyScheduleDialog).toBeVisible();
  await dailyScheduleDialog.getByRole('button', { name: '일정 추가' }).click();
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
