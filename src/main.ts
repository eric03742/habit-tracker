import { completeToday, completedHabits, habits, recordingDate } from './habits';
import type { HabitId } from './habits';
import './style.css';

const icons: Record<HabitId, string> = {
  running: '<circle cx="16" cy="4" r="2"/><path d="m12 8 4 3 4 1M16 7l-5 7 5 3-1 5M12 8l-4 1-3 4M11 14l-3 5H3"/>',
  'early-sleep': '<path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z"/><path d="M17 3v4m-2-2h4"/>',
  reading: '<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="日常 · 习惯追踪首页">
      <span class="brand-mark" aria-hidden="true">日</span>
      <span>日常<span class="brand-caption">习惯追踪</span></span>
    </a>
    <span class="header-note">把小小的坚持，留在每一天。</span>
  </header>
  <main>
    <div class="intro">
      <p class="eyebrow">专注今天 · 慢慢积累</p>
      <h1>今天，也为自己积累一点。</h1>
      <p class="intro-note">不必一下子走很远，从今天的一次行动开始。</p>
    </div>
    <div class="date-navigation">
      <label for="viewing-date">查看日期</label>
      <input id="viewing-date" type="date" aria-describedby="date-error" required />
      <button id="return-today" type="button">返回今天</button>
    </div>
    <p id="date-error" role="alert" hidden>只能查看今天或过去的日期。</p>
    <section class="today-summary" aria-label="今日概览">
      <div class="date-block">
        <span class="today-label">今天</span>
        <time id="recording-date"></time>
        <span id="weekday"></span>
      </div>
      <div class="progress-block">
        <div class="progress-heading">
          <span id="progress-label">今日完成</span>
          <output id="completion-count" aria-label="今日完成数">0 / 3</output>
        </div>
        <progress id="completion-progress" aria-label="今日完成进度" max="3" value="0"></progress>
        <p id="progress-note">每一个小小的行动，都算数。</p>
      </div>
    </section>
    <div class="section-heading">
      <h2>今天的习惯</h2>
      <span>完成一项，记录一次</span>
    </div>
    <div class="habits">
      ${habits.map((habit, index) => `
        <section class="habit-card" id="${habit.id}" aria-labelledby="${habit.id}-title">
          <div class="card-top">
            <span class="habit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[habit.id]}</svg>
            </span>
            <span class="habit-number" aria-hidden="true">0${index + 1}</span>
          </div>
          <h3 id="${habit.id}-title">${habit.name}</h3>
          <p class="habit-note">${habit.note}</p>
          <p class="habit-status">未记录</p>
          <button type="button"><span aria-hidden="true">＋</span> 标记完成</button>
        </section>
      `).join('')}
    </div>
    <p class="recording-note">由你判断是否完成。每天记录一次，完成后不可撤销。</p>
    <p id="save-error" role="alert" hidden></p>
  </main>
  <footer>
    <span><span class="local-dot" aria-hidden="true"></span>记录保存在当前浏览器</span>
    <span>日复一日，自有收获。</span>
  </footer>
`;

const dateElement = document.querySelector<HTMLTimeElement>('#recording-date')!;
const dateInput = document.querySelector<HTMLInputElement>('#viewing-date')!;
const returnTodayButton = document.querySelector<HTMLButtonElement>('#return-today')!;
const dateErrorElement = document.querySelector<HTMLParagraphElement>('#date-error')!;
const countElement = document.querySelector<HTMLOutputElement>('#completion-count')!;
const progressElement = document.querySelector<HTMLProgressElement>('#completion-progress')!;
const errorElement = document.querySelector<HTMLParagraphElement>('#save-error')!;
// null 表示跟随今天；历史查看固定在用户所选的日期。
let selectedDate: string | null = null;

dateInput.addEventListener('change', () => {
  const today = recordingDate();
  dateInput.max = today;
  if (!dateInput.validity.valid) {
    dateErrorElement.hidden = false;
    refresh();
    return;
  }
  selectedDate = dateInput.value !== today ? dateInput.value : null;
  dateErrorElement.hidden = true;
  refresh();
});
returnTodayButton.addEventListener('click', () => {
  selectedDate = null;
  dateErrorElement.hidden = true;
  refresh();
});

const habitElements = habits.map(habit => {
  const card = document.querySelector<HTMLElement>(`#${habit.id}`)!;
  const button = card.querySelector<HTMLButtonElement>('button')!;
  button.addEventListener('click', () => {
    if (selectedDate !== null) return;
    try {
      completeToday(habit.id);
      errorElement.hidden = true;
      refresh();
    } catch {
      showStorageError('未能保存这次完成记录，请允许浏览器保存网站数据后重试。');
    }
  });
  return { habit, card, button, status: card.querySelector<HTMLElement>('.habit-status')! };
});

function render(): void {
  const today = recordingDate();
  const date = selectedDate ?? today;
  const isToday = date === today;
  // 日期输入值是本地自然日，不能按 UTC 午夜解析。
  const viewingDate = new Date(`${date}T12:00:00`);
  const completed = completedHabits(date);
  dateInput.max = today;
  dateInput.value = date;
  returnTodayButton.disabled = isToday;
  dateElement.dateTime = date;
  dateElement.textContent = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(viewingDate);
  document.querySelector('#weekday')!.textContent = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
  }).format(viewingDate);
  document.querySelector('.today-summary')!.setAttribute('aria-label', isToday ? '今日概览' : '当日概览');
  document.querySelector('.today-label')!.textContent = isToday ? '今天' : '历史 · 只读';
  document.querySelector('#progress-label')!.textContent = isToday ? '今日完成' : '当日完成';
  countElement.setAttribute('aria-label', isToday ? '今日完成数' : '当日完成数');
  progressElement.setAttribute('aria-label', isToday ? '今日完成进度' : '当日完成进度');
  document.querySelector('.section-heading h2')!.textContent = isToday ? '今天的习惯' : '当天的习惯';
  document.querySelector('.section-heading > span')!.textContent = isToday ? '完成一项，记录一次' : '历史记录仅供查看';
  document.querySelector('.recording-note')!.textContent = isToday
    ? '由你判断是否完成。每天记录一次，完成后不可撤销。'
    : '历史记录只读，不能补记、撤销或编辑。返回今天继续记录。';
  countElement.textContent = `${completed.length} / ${habits.length}`;
  progressElement.value = completed.length;
  document.querySelector('#progress-note')!.textContent = completed.length === habits.length
    ? `${isToday ? '今天' : '当天'}的三个习惯，都已留下记录。`
    : '每一个小小的行动，都算数。';
  for (const { habit, card, button, status } of habitElements) {
    const isComplete = completed.includes(habit.id);
    card.classList.toggle('is-complete', isComplete);
    status.textContent = isComplete ? '已完成' : '未记录';
    button.disabled = !isToday || isComplete;
    button.innerHTML = isComplete
      ? `<span aria-hidden="true">✓</span> ${isToday ? '今日' : '当日'}已完成`
      : isToday ? '<span aria-hidden="true">＋</span> 标记完成' : '历史只读';
  }
}

function showStorageError(message: string): void {
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function refresh(): void {
  try {
    render();
  } catch {
    showStorageError('暂时无法读取完成记录，请允许浏览器访问网站数据后刷新。');
  }
}

refresh();

// 浏览器后台可能暂停计时器；恢复页面时刷新，点击仍由 completeToday 取当时的记录日。
window.setInterval(() => {
  if (dateInput.max !== recordingDate()) refresh();
}, 1_000);
window.addEventListener('focus', refresh);
window.addEventListener('pageshow', refresh);
window.addEventListener('storage', refresh);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});
