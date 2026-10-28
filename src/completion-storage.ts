import type { HabitId } from './habits';

function recordKey(date: string, habit: HabitId): string {
  return `habit-tracker:completion:v1:${date}:${habit}`;
}

export function hasCompletion(date: string, habit: HabitId): boolean {
  return localStorage.getItem(recordKey(date, habit)) === 'completed';
}

export function saveCompletion(date: string, habit: HabitId): void {
  // 独立键让重复记录幂等，也避免跨日期或不同标签页互相覆盖。
  localStorage.setItem(recordKey(date, habit), 'completed');
}
