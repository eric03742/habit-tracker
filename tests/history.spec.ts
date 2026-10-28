import { expect, test } from '@playwright/test';

test('选择历史日期显示当天记录和完成数，历史只读且可以返回今天继续打卡', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00+08:00'));
  await page.goto('/');
  await page.getByRole('region', { name: '跑步', exact: true }).getByRole('button').click();

  await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
  await page.reload();
  await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
  await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('2 / 3');

  const date = page.getByLabel('查看日期');
  await expect(date).toHaveValue('2026-10-28');
  await date.fill('2026-10-27');
  await expect(page.getByText('2026年10月27日', { exact: true })).toBeVisible();
  await expect(page.getByText('历史 · 只读', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '跑步', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
  for (const name of ['早睡', '阅读']) {
    await expect(page.getByRole('region', { name, exact: true }).getByText('未记录', { exact: true })).toBeVisible();
  }
  for (const name of ['跑步', '早睡', '阅读']) {
    await expect(page.getByRole('region', { name, exact: true }).getByRole('button')).toBeDisabled();
  }

  await page.getByRole('button', { name: '返回今天' }).click();
  await expect(date).toHaveValue('2026-10-28');
  await expect(page.getByText('2026年10月28日', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('2 / 3');
  const running = page.getByRole('region', { name: '跑步', exact: true });
  await expect(running.getByText('未记录', { exact: true })).toBeVisible();
  await running.getByRole('button', { name: '标记完成' }).click();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('3 / 3');

  await date.fill('2026-10-27');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');

  await date.fill('2026-10-26');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('0 / 3');
  for (const name of ['跑步', '早睡', '阅读']) {
    const habit = page.getByRole('region', { name, exact: true });
    await expect(habit.getByText('未记录', { exact: true })).toBeVisible();
    await expect(habit.getByRole('button')).toBeDisabled();
  }

  await page.reload();
  await expect(date).toHaveValue('2026-10-28');
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('3 / 3');
  await date.fill('2026-10-27');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '跑步', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
  await date.fill('2026-10-26');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('0 / 3');
  // 日期选择器也能回到今天，恢复正常打卡状态。
  await date.fill('2026-10-28');
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('3 / 3');
  await expect(page.getByRole('button', { name: '今日已完成' })).toHaveCount(3);
});

test('未来日期被拒绝并保留当前查看日期，不能提前产生完成记录', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
  await page.goto('/');
  const date = page.getByLabel('查看日期');
  await expect(date).toHaveAttribute('max', '2026-10-28');
  await date.fill('2026-10-29');
  await expect(page.getByRole('alert')).toHaveText('只能查看今天或过去的日期。');
  await expect(date).toHaveValue('2026-10-28');
  await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');

  await date.fill('2026-10-27');
  await date.fill('2026-10-29');
  await expect(date).toHaveValue('2026-10-27');
  for (const name of ['跑步', '早睡', '阅读']) {
    await expect(page.getByRole('region', { name, exact: true }).getByRole('button')).toBeDisabled();
  }

  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00+08:00'));
  await page.reload();
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
  await date.fill('2026-10-28');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '阅读', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
});

test('查看历史跨过午夜时保持所选日期，返回今天后可以记录新的自然日', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-31T23:59:58+08:00') });
  await page.clock.pauseAt(new Date('2026-12-31T23:59:59+08:00'));
  await page.goto('/');
  await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
  const date = page.getByLabel('查看日期');
  await date.fill('2026-12-30');

  await page.clock.runFor(2_000);
  await expect(date).toHaveAttribute('max', '2027-01-01');
  await expect(date).toHaveValue('2026-12-30');
  await expect(page.getByText('2026年12月30日', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('0 / 3');
  for (const name of ['跑步', '早睡', '阅读']) {
    await expect(page.getByRole('region', { name, exact: true }).getByRole('button')).toBeDisabled();
  }

  await page.getByRole('button', { name: '返回今天' }).click();
  await expect(date).toHaveValue('2027-01-01');
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('0 / 3');
  await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
  await date.fill('2026-12-31');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
  await expect(page.getByRole('region', { name: '阅读', exact: true }).getByText('已完成', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '早睡', exact: true }).getByText('未记录', { exact: true })).toBeVisible();
});
