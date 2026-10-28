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
    for (const name of ['当前连续天数', '最长连续天数']) {
      await expect(page.getByRole('region', { name: '阅读', exact: true }).getByRole('status', { name })).toHaveText('1 天');
    }
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
    for (const name of ['当前连续天数', '最长连续天数']) {
      await expect(page.getByRole('region', { name: '阅读', exact: true }).getByRole('status', { name })).toHaveText('1 天');
      await expect(page.getByRole('region', { name: '跑步', exact: true }).getByRole('status', { name })).toHaveText('0 天');
      await expect(page.getByRole('region', { name: '早睡', exact: true }).getByRole('status', { name })).toHaveText('0 天');
    }

    await page.clock.setFixedTime(new Date('2026-10-29T12:00:00+08:00'));
    await page.reload();
    await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
    for (const name of ['当前连续天数', '最长连续天数']) {
      await expect(page.getByRole('region', { name: '阅读', exact: true }).getByRole('status', { name })).toHaveText('1 天');
    }
    await page.getByLabel('查看日期').fill('2026-10-28');
    await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
    await expect(page.getByRole('region', { name: '阅读', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
    for (const name of ['跑步', '早睡', '阅读']) {
      await expect(page.getByRole('region', { name, exact: true }).getByRole('button')).toBeDisabled();
    }
  } finally {
    await reopened.close();
  }
});
