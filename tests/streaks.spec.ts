import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function expectStreaks(page: Page, habit: string, current: number, longest: number): Promise<void> {
  const card = page.getByRole('region', { name: habit, exact: true });
  await expect(card.getByRole('status', { name: '当前连续天数', exact: true })).toHaveText(`${current} 天`);
  await expect(card.getByRole('status', { name: '最长连续天数', exact: true })).toHaveText(`${longest} 天`);
}

test('三个习惯从零开始独立统计，今天未完成保留昨天的连续天数，完成后增长且重复点击不累加', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00+08:00'));
  await page.goto('/');
  for (const habit of ['跑步', '早睡', '阅读']) {
    await expectStreaks(page, habit, 0, 0);
  }

  const reading = page.getByRole('region', { name: '阅读', exact: true });
  await reading.getByRole('button').click();
  await expectStreaks(page, '阅读', 1, 1);
  for (const date of ['2026-10-26', '2026-10-27']) {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00+08:00`));
    await page.reload();
    await reading.getByRole('button').click();
  }

  await page.clock.setFixedTime(new Date('2026-10-28T12:00:00+08:00'));
  await page.reload();
  await expectStreaks(page, '阅读', 3, 3);
  await expect(reading.getByText('未记录', { exact: true })).toBeVisible();
  await reading.getByRole('button').dblclick();
  await reading.getByRole('button').click({ force: true });
  await expectStreaks(page, '阅读', 4, 4);
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');

  for (const habit of ['跑步', '早睡']) {
    await expectStreaks(page, habit, 0, 0);
    await page.getByRole('region', { name: habit, exact: true }).getByRole('button').click();
    await expectStreaks(page, habit, 1, 1);
  }
  await expectStreaks(page, '阅读', 4, 4);
});

test('漏掉一个自然日后当前连续天数归零，重新完成从一天开始且历史查看不改变统计', async ({ page }) => {
  const reading = page.getByRole('region', { name: '阅读', exact: true });
  for (const date of ['2026-10-25', '2026-10-26', '2026-10-27']) {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00+08:00`));
    await page.goto('/');
    await reading.getByRole('button').click();
  }
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00+08:00'));
  await page.reload();
  await expectStreaks(page, '阅读', 0, 3);

  await page.getByLabel('查看日期').fill('2026-10-26');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('1 / 3');
  await expect(reading.getByText('已完成', { exact: true })).toBeVisible();
  await expect(reading.getByRole('button')).toBeDisabled();
  await expectStreaks(page, '阅读', 0, 3);
  await expect(page.getByText('连续天数不随查看日期改变：当前以今天为准，最长覆盖全部记录。')).toBeVisible();

  await page.getByRole('button', { name: '返回今天' }).click();
  await reading.getByRole('button').click();
  await expectStreaks(page, '阅读', 1, 3);
  await page.getByLabel('查看日期').fill('2026-10-28');
  await expect(page.getByRole('status', { name: '当日完成数' })).toHaveText('0 / 3');
  await expect(reading.getByText('未记录', { exact: true })).toBeVisible();
  await expect(reading.getByRole('button')).toBeDisabled();
  await expectStreaks(page, '阅读', 1, 3);

  await page.getByLabel('查看日期').fill('2026-10-29');
  await expect(page.getByRole('status', { name: '今日完成数' })).toHaveText('1 / 3');
  await expectStreaks(page, '阅读', 1, 3);
  await page.reload();
  await expectStreaks(page, '阅读', 1, 3);
});

test('历史最长五天在中断后仍保留，新一段当前连续两天并能继续超过历史最长', async ({ page }) => {
  const running = page.getByRole('region', { name: '跑步', exact: true });
  for (const date of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00+08:00`));
    await page.goto('/');
    await running.getByRole('button').click();
  }
  await expectStreaks(page, '跑步', 5, 5);
  for (const date of ['2026-10-08', '2026-10-09']) {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00+08:00`));
    await page.reload();
    await running.getByRole('button').click();
  }
  await expectStreaks(page, '跑步', 2, 5);
  await running.getByRole('button').click({ force: true });
  await expectStreaks(page, '跑步', 2, 5);
  await page.getByLabel('查看日期').fill('2026-10-03');
  await expectStreaks(page, '跑步', 2, 5);
  await page.reload();
  await expectStreaks(page, '跑步', 2, 5);

  for (const date of ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']) {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00+08:00`));
    await page.reload();
    await running.getByRole('button').click();
  }
  await expectStreaks(page, '跑步', 6, 6);
});

test.describe('本地相邻自然日', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  for (const { name, times, expected } of [
    {
      name: '跨年',
      times: ['2026-12-31T23:30:00-08:00', '2027-01-01T00:30:00-08:00'],
      expected: 2,
    },
    {
      name: '闰年二月跨月',
      times: ['2028-02-28T12:00:00-08:00', '2028-02-29T12:00:00-08:00', '2028-03-01T12:00:00-08:00'],
      expected: 3,
    },
    {
      name: '夏令时开始的二十三小时自然日',
      times: ['2026-03-07T12:00:00-08:00', '2026-03-08T12:00:00-07:00', '2026-03-09T12:00:00-07:00'],
      expected: 3,
    },
    {
      name: '夏令时结束的二十五小时自然日',
      times: ['2026-10-31T12:00:00-07:00', '2026-11-01T12:00:00-08:00', '2026-11-02T12:00:00-08:00'],
      expected: 3,
    },
  ]) {
    test(`${name}仍连续计数`, async ({ page }) => {
      for (const time of times) {
        await page.clock.setFixedTime(new Date(time));
        await page.goto('/');
        await page.getByRole('region', { name: '早睡', exact: true }).getByRole('button').click();
      }
      await expectStreaks(page, '早睡', expected, expected);
      await page.reload();
      await expectStreaks(page, '早睡', expected, expected);
    });
  }
});

for (const view of ['今天', '历史']) {
  test(`停留在${view}时跨午夜会重新计算当前连续天数，漏记一天后归零`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-27T23:59:58+08:00') });
    await page.clock.pauseAt(new Date('2026-10-27T23:59:59+08:00'));
    await page.goto('/');
    await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
    if (view === '历史') await page.getByLabel('查看日期').fill('2026-10-25');

    await page.clock.runFor(2_000);
    await expectStreaks(page, '阅读', 1, 1);
    await page.clock.fastForward('24:00:00');
    await expectStreaks(page, '阅读', 0, 1);
    await expect(page.getByLabel('查看日期')).toHaveValue(view === '历史' ? '2026-10-25' : '2026-10-29');
    if (view === '历史') await page.getByRole('button', { name: '返回今天' }).click();
    await page.getByRole('region', { name: '阅读', exact: true }).getByRole('button').click();
    await expectStreaks(page, '阅读', 1, 1);
  });
}
