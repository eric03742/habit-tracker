import type { HabitId } from './habits';

const completionPrefix = 'habit-tracker:completion:v1:';

function recordKey(date: string, habit: HabitId): string {
  return `${completionPrefix}${date}:${habit}`;
}

export function hasCompletion(date: string, habit: HabitId): boolean {
  return localStorage.getItem(recordKey(date, habit)) === 'completed';
}

export function completionDates(habit: HabitId): string[] {
  const pattern = new RegExp(`^${completionPrefix}(\\d{4}-\\d{2}-\\d{2}):${habit}$`);
  const dates: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const date = localStorage.key(index)?.match(pattern)?.[1];
    if (date && hasCompletion(date, habit)) dates.push(date);
  }
  return dates;
}

export function saveCompletion(date: string, habit: HabitId): void {
  // 独立键让重复记录幂等，也避免跨日期或不同标签页互相覆盖。
  localStorage.setItem(recordKey(date, habit), 'completed');
}
