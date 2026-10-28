import { completionDates, hasCompletion, saveCompletion } from './completion-storage';

export const habits = [
  { id: 'running', name: '跑步', note: '迈出脚步，感受身体的力量。' },
  { id: 'early-sleep', name: '早睡', note: '给自己一段好好休息的时间。' },
  { id: 'reading', name: '阅读', note: '翻开书页，遇见新的想法。' },
] as const;

export type HabitId = (typeof habits)[number]['id'];

export function completedHabits(date: string): HabitId[] {
  return habits.filter(habit => hasCompletion(date, habit.id)).map(habit => habit.id);
}

export function completeToday(habit: HabitId): void {
  saveCompletion(recordingDate(), habit);
}

function previousRecordingDate(date: string): string {
  // 用本地日历退一天，跨月、跨年和夏令时变化都不按固定 24 小时计算。
  const previous = new Date(`${date}T12:00:00`);
  previous.setDate(previous.getDate() - 1);
  return recordingDate(previous);
}

export function habitStreaks(habit: HabitId, today: string): { current: number; longest: number } {
  const yesterday = previousRecordingDate(today);
  let current = 0;
  let longest = 0;
  let length = 0;
  let previous: string | undefined;
  for (const date of completionDates(habit).sort()) {
    length = previous === previousRecordingDate(date) ? length + 1 : 1;
    longest = Math.max(longest, length);
    if (date === today || date === yesterday) current = length;
    previous = date;
  }
  return { current, longest };
}

export function recordingDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
