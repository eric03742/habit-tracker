import { expect, test } from '@playwright/test';

test('首次打开显示今天的本地日期、三个未记录习惯及完成数', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-28T00:30:00+08:00'));
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '今天，也为自己积累一点。' })).toBeVisible();
  await expect(page.getByText('2026年10月28日', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
  for (const name of ['跑步', '早睡', '阅读']) {
    const habit = page.getByRole('region', { name, exact: true });
    await expect(habit.getByText('未记录', { exact: true })).toBeVisible();
    await expect(habit.getByRole('button', { name: '标记完成' })).toBeEnabled();
  }
});

test('一次完成只影响对应习惯，重复点击不会增加完成数或撤销', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
  await page.goto('/');

  const reading = page.getByRole('region', { name: '阅读', exact: true });
  const button = reading.getByRole('button');
  await button.dblclick();
  await expect(reading.getByText('已完成', { exact: true })).toBeVisible();
  await expect(button).toBeDisabled();
  await button.click({ force: true });
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
  for (const name of ['跑步', '早睡']) {
    const habit = page.getByRole('region', { name, exact: true });
    await expect(habit.getByText('未记录', { exact: true })).toBeVisible();
    await habit.getByRole('button', { name: '标记完成' }).click();
  }
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('3 / 3');
  await expect(page.getByRole('button', { name: '今日已完成' })).toHaveCount(3);
});
