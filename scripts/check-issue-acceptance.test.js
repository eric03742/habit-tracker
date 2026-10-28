import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const command = fileURLToPath(new URL('./check-issue-acceptance.js', import.meta.url));

function issue(number, body, extra = {}) {
  return { number, title: `验收示例 ${number}`, state: 'CLOSED', url: `https://github.com/eric03742/habit-tracker/issues/${number}`, body, ...extra };
}

function run(t, fixture, args = []) {
  const directory = mkdtempSync(join(tmpdir(), 'habit-issue-audit-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'fixture.json'), JSON.stringify(fixture));
  // 在 GitHub CLI 这个外部边界提供固定响应，实际运行被测命令及其参数解析、输出和退出码。
  writeFileSync(join(directory, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync(process.env.AUDIT_TEST_FIXTURE, 'utf8'));
const args = process.argv.slice(2);
let response;
if (args[0] === 'api' && args.includes('--paginate') && args.includes('--slurp') && args.at(-1) === 'repos/eric03742/habit-tracker/issues?state=closed&per_page=100') {
  response = fixture.pages;
} else if (args[0] === 'issue' && args[1] === 'view' && args[3] === '--repo' && args[4] === 'eric03742/habit-tracker') {
  response = fixture.issues?.[args[2]];
} else {
  throw new Error('Unexpected GitHub command: ' + args.join(' '));
}
if (fixture.error) {
  process.stderr.write(fixture.error);
  process.exit(1);
}
process.stdout.write(fixture.raw ?? JSON.stringify(response));
`, { mode: 0o755 });
  return spawnSync(process.execPath, [command, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: [directory, dirname(process.execPath), process.env.PATH].join(delimiter),
      AUDIT_TEST_FIXTURE: join(directory, 'fixture.json'),
    },
  });
}

test('指定已关闭 Issue 的未勾选验收项会报告原文与链接并退出 1', t => {
  const result = run(t, { issues: { 3: issue(3, '## Acceptance criteria\n- [x] 已完成\n- [ ] 历史日期只读\n## Notes\n- [ ] 无关事项') } }, ['3']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /#3 验收示例 3：1 项验收未勾选/);
  assert.match(result.stdout, /issues\/3/);
  assert.match(result.stdout, /历史日期只读/);
  assert.doesNotMatch(result.stdout, /无关事项/);
});

test('完整审计处理所有分页并排除 PR', t => {
  const result = run(t, {
    pages: [
      [issue(2, '## Acceptance criteria\n- [x] 保存记录'), issue(5, '## Acceptance criteria\n- [ ] PR 示例', { pull_request: {} })],
      [issue(4, '## Acceptance criteria\n- [ ] 连续天数', { state: 'closed', url: 'https://api.github.com/repos/eric03742/habit-tracker/issues/4', html_url: 'https://github.com/eric03742/habit-tracker/issues/4' })],
    ],
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /#4 验收示例 4/);
  assert.match(result.stdout, /已检查 2 个已关闭 Issue，跳过 0 个，未勾选验收项 1 个/);
  assert.doesNotMatch(result.stdout, /PR 示例/);
  assert.match(result.stdout, /https:\/\/github.com\/eric03742\/habit-tracker\/issues\/4/);
  assert.doesNotMatch(result.stdout, /api.github.com/);
});

test('验收全部完成时退出 0，未关闭及无验收标题的 Issue 明确报告跳过', t => {
  const result = run(t, { issues: {
    1: issue(1, '## Acceptance criteria\n- [ ] 尚未实现', { state: 'OPEN' }),
    2: issue(2, '## acceptance criteria\n- [x] 保存记录\n- [X] 重新访问'),
    3: issue(3, '## Notes\n- [ ] 普通待办'),
  } }, ['1', '2', '3']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /跳过 #1：尚未关闭/);
  assert.match(result.stdout, /跳过 #3：没有可识别的验收标题/);
  assert.match(result.stdout, /已检查 1 个已关闭 Issue，跳过 2 个，未勾选验收项 0 个/);
});

test('中文验收标题覆盖子节和不同任务列表格式，代码块示例与后续章节不计入', t => {
  const body = [
    '## 验收标准', '### 验收清单', '- [ ] 今日记录', '### 自动检查', '  * [ ] 类型检查', '1. [ ] 浏览器验收',
    '```markdown', '## Acceptance criteria', '- [ ] 代码示例一', '```',
    '~~~~', '- [ ] 代码示例二', '~~~~', '- [x] 已完成',
    '## 备注', '- [ ] 非验收事项', '## 验收清单', '+ [ ] 重新访问',
  ].join('\r\n');
  const result = run(t, { issues: { 3: issue(3, body) } }, ['3']);
  assert.equal(result.status, 1, result.stderr);
  for (const text of ['今日记录', '类型检查', '浏览器验收', '重新访问']) assert.ok(result.stdout.includes(text));
  assert.match(result.stdout, /4 项验收未勾选/);
  assert.doesNotMatch(result.stdout, /代码示例|非验收事项/);
});

test('没有已关闭 Issue 时返回可辨识的空结果', t => {
  const result = run(t, { pages: [[]] });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /已检查 0 个已关闭 Issue，跳过 0 个，未勾选验收项 0 个/);
});

test('GitHub 查询失败或响应损坏时退出 2，不能误报通过', t => {
  for (const fixture of [{ error: 'GitHub authentication failed' }, { raw: 'invalid JSON' }]) {
    const result = run(t, fixture);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /验收清单检查失败/);
    assert.doesNotMatch(result.stdout, /已检查/);
  }
});

test('帮助和非法参数无需访问 GitHub', t => {
  const fixture = { error: 'GitHub must not be called' };
  const help = run(t, fixture, ['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /用法/);
  for (const argument of ['0', '-1', '3;echo', '--repo']) {
    const result = run(t, fixture, [argument]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Issue 编号必须是正整数/);
    assert.doesNotMatch(result.stderr, /GitHub must not be called/);
  }
});
