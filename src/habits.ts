import { hasCompletion, saveCompletion } from './completion-storage';

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

export function recordingDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
