import { chromium, expect, test } from '@playwright/test';

test('完成记录在刷新和正常关闭浏览器后重新打开时保留', async ({ baseURL }, testInfo) => {
  const profile = testInfo.outputPath('browser-profile');
  const options = { baseURL, timezoneId: 'Asia/Shanghai', locale: 'zh-CN' };
  const browser = await chromium.launchPersistentContext(profile, options);
  try {
    const page = browser.pages()[0]!;
    await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
    await page.goto('/');
    await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
    await page.reload();
    await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
    await expect(page.getByRole('region', { name: '阅读', exact: true }).getByRole('button')).toBeDisabled();
  } finally {
    await browser.close();
  }

  const reopened = await chromium.launchPersistentContext(profile, options);
  try {
    const page = reopened.pages()[0]!;
    await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
    await page.goto('/');
    await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
    await expect(page.getByRole('region', { name: '阅读', exact: true }).getByRole('button')).toBeDisabled();
    await expect(page.getByRole('region', { name: '跑步', exact: true }).getByText('未记录')).toBeVisible();
    await expect(page.getByRole('region', { name: '早睡', exact: true }).getByText('未记录')).toBeVisible();
  } finally {
    await reopened.close();
  }
});
