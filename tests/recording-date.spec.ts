import { expect, test } from '@playwright/test';

test('页面跨本地午夜更新今天，新的完成记录不会改写旧日期', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T23:59:58+08:00') });
  await page.clock.pauseAt(new Date('2026-10-28T23:59:59+08:00'));
  await page.goto('/');
  await page.getByRole('region', { name: '跑步', exact: true }).getByRole('button').click();

  await page.clock.runFor(2_000);
  await expect(page.getByText('2026年10月29日', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
  await expect(page.getByRole('region', { name: '跑步', exact: true }).getByRole('button')).toBeEnabled();
  await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');

  // 仅回拨测试时钟并重新访问页面，验证昨天保存的记录未被覆盖或补记。
  await page.clock.setSystemTime(new Date('2026-10-28T12:00:00+08:00'));
  await page.reload();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '跑步', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '早睡', exact: true }).getByText('未记录')).toBeVisible();

  await page.clock.setSystemTime(new Date('2026-10-29T12:00:00+08:00'));
  await page.reload();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '早睡', exact: true }).getByRole('button')).toBeDisabled();
  await expect(page.getByRole('region', { name: '跑步', exact: true }).getByText('未记录')).toBeVisible();
});

test('计时器尚未更新页面时，打卡仍按点击时的本地日期记录', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-31T23:59:58+08:00') });
  await page.clock.pauseAt(new Date('2026-12-31T23:59:59+08:00'));
  await page.goto('/');

  // 改变墙上时钟而不推进计时器，模拟页面暂停跨日后立即点击。
  await page.clock.setSystemTime(new Date('2027-01-01T00:00:01+08:00'));
  await expect(page.getByText('2026年12月31日', { exact: true })).toBeVisible();
  await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
  await expect(page.getByText('2027年1月1日', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
  await page.reload();
  await expect(page.getByRole('region', { name: '早睡', exact: true }).getByRole('button')).toBeDisabled();

  await page.clock.setSystemTime(new Date('2026-12-31T12:00:00+08:00'));
  await page.reload();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
});

test.describe('美国西海岸时区', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('UTC 已到次日时仍显示本地日期，早睡也归入点击当天', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-28T02:30:00Z'));
    await page.goto('/');
    await expect(page.getByText('2026年10月27日', { exact: true })).toBeVisible();
    await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
    await page.reload();
    await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');

    await page.clock.setFixedTime(new Date('2026-10-28T08:30:00Z'));
    await page.reload();
    await expect(page.getByText('2026年10月28日', { exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
  });
});
