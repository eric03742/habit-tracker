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
  for (const args of [['3'], ['--strict', '3']]) {
    const result = run(t, { issues: { 3: issue(3, '## Acceptance criteria\n- [x] 已完成\n- [ ] 历史日期只读\n## Notes\n- [ ] 无关事项') } }, args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /#3 验收示例 3：1 项验收未勾选/);
    assert.match(result.stdout, /issues\/3/);
    assert.match(result.stdout, /历史日期只读/);
    assert.doesNotMatch(result.stdout, /无关事项/);
  }
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
    4: issue(4, '## 验收清单\n待整理。'),
  } }, ['1', '2', '3', '4']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /跳过 #1：尚未关闭/);
  assert.match(result.stdout, /跳过 #3：没有可识别的验收标题/);
  assert.match(result.stdout, /已检查 2 个已关闭 Issue，跳过 2 个，未勾选验收项 0 个/);
});

for (const { name, body, extra, reason } of [
  { name: '尚未关闭', body: '## 验收清单\n- [x] 已完成', extra: { state: 'OPEN' }, reason: '尚未关闭' },
  { name: '缺少验收标题', body: '## Notes\n- [x] 普通待办', reason: '没有可识别的验收标题' },
  { name: '只有验收标题', body: '## 验收清单', reason: '没有有效的验收条目' },
  { name: '只有说明和样例表', body: '## 验收清单\n待整理。\n\n| 场景 | 预期 |\n| --- | --- |\n| 点击 | 保存 |', reason: '没有有效的验收条目' },
  { name: '条目仅在代码块或无关章节', body: '## 验收清单\n```markdown\n- [x] 示例\n```\n## Notes\n- [x] 普通待办', reason: '没有有效的验收条目' },
  { name: '勾选项没有实际内容', body: '## 验收清单\n- [x]    ', reason: '没有有效的验收条目' },
]) {
  test(`严格模式拒绝${name}并返回原因和链接`, t => {
    const result = run(t, { issues: { 1: issue(1, body, extra) } }, ['--strict', '1']);
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stdout.includes(reason));
    assert.match(result.stdout, /https:\/\/github.com\/eric03742\/habit-tracker\/issues\/1/);
    assert.match(result.stdout, /状态或清单结构不合格 1 个/);
    assert.doesNotMatch(result.stdout, /跳过/);
  });
}

test('严格模式接受已关闭且全部完成的清单，支持子节、多种条目格式和重复编号去重', t => {
  const body = [
    '## Acceptance criteria', '- [x] 保存记录', '### 浏览器验证', '* [X] 重新访问',
    '```markdown', '- [ ] 示例', '```', '## 备注', '- [ ] 无关待办',
    '## 验收标准', '1. [x] 历史只读',
  ].join('\n');
  const result = run(t, { issues: {
    1: issue(1, body),
    2: issue(2, '## 验收清单\n+ [X] 连续天数', { state: 'closed' }),
  } }, ['--strict', '1', '1', '2']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /已检查 2 个已关闭 Issue，状态或清单结构不合格 0 个，未勾选验收项 0 个/);
});

test('严格模式拒绝只有列表内围栏代码示例的验收清单', t => {
  const body = [
    '## 验收清单', '- 示例说明', '',
    '    ```markdown', '    - [x] 示例条目', '    ```',
  ].join('\n');
  const result = run(t, { issues: { 1: issue(1, body) } }, ['--strict', '1']);
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stdout, /没有有效的验收条目/);
});

for (const { name, lines } of [
  { name: '无空行和语言标记的列表围栏', lines: ['- 示例说明', '    ```', '    - [x] 示例条目', '    ```'] },
  { name: '有序列表中的围栏', lines: ['10. 示例说明', '', '    ```markdown', '    - [X] 示例条目', '    ```'] },
  { name: '嵌套列表中的波浪号围栏', lines: ['- 外层说明', '  - 内层说明', '', '      ~~~markdown', '      - [x] 示例条目', '      ~~~~'] },
  { name: '制表符缩进的列表围栏', lines: ['- 示例说明', '', '\t```markdown', '\t- [x] 示例条目', '\t```'] },
  { name: '缩进代码块', lines: ['', '    - [x] 示例条目'] },
]) {
  test(`严格模式拒绝只有${name}的验收清单`, t => {
    const body = ['## 验收清单', ...lines].join('\n');
    const result = run(t, { issues: { 1: issue(1, body) } }, ['--strict', '1']);
    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stdout, /没有有效的验收条目/);
  });
}

test('两种模式都忽略列表围栏中的未勾选示例并保留后续真实条目', t => {
  for (const checked of ['x', ' ']) {
    const body = [
      '## 验收清单', '- 示例说明', '',
      '    ```markdown', '    - [ ] 示例条目', '    ## 备注', '    ```',
      `- [${checked}] 真实验收项`,
    ].join('\r\n');
    for (const args of [['1'], ['--strict', '1']]) {
      const result = run(t, { issues: { 1: issue(1, body) } }, args);
      assert.equal(result.status, checked === 'x' ? 0 : 1, result.stdout || result.stderr);
      assert.doesNotMatch(result.stdout, /示例条目|没有有效的验收条目/);
      if (checked === ' ') {
        assert.match(result.stdout, /1 项验收未勾选/);
        assert.match(result.stdout, /真实验收项/);
      }
    }
  }
});

test('列表围栏随列表项结束，不吞掉其后的真实嵌套验收项', t => {
  const body = [
    '## 验收清单', '- 示例说明', '    ```markdown', '    - [x] 示例条目',
    '- 真实清单', '  - [x] 已完成验收', '  - [ ] 待完成验收',
  ].join('\n');
  const result = run(t, { issues: { 1: issue(1, body) } }, ['--strict', '1']);
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stdout, /1 项验收未勾选/);
  assert.match(result.stdout, /待完成验收/);
  assert.doesNotMatch(result.stdout, /示例条目|没有有效的验收条目/);
});

test('顶层围栏内的四空格伪结束标记不会暴露代码示例', t => {
  const body = [
    '## 验收清单', '```markdown', '    ```', '- [ ] 示例条目', '```', '- [x] 真实验收项',
  ].join('\n');
  const result = run(t, { issues: { 1: issue(1, body) } }, ['--strict', '1']);
  assert.equal(result.status, 0, result.stdout || result.stderr);
  assert.doesNotMatch(result.stdout, /示例条目|没有有效的验收条目/);
});

test('严格模式汇总不同 Issue 的结构问题与未完成项，并继续检查其余目标', t => {
  const result = run(t, { issues: {
    1: issue(1, '## 验收清单\n- [x] 已完成', { state: 'OPEN' }),
    2: issue(2, '## 验收标准\n- [x] 保存记录\n- [ ] 历史只读'),
    3: issue(3, '## 验收清单\n- [X] 连续天数'),
  } }, ['1', '2', '3', '--strict']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /#1.*尚未关闭/);
  assert.match(result.stdout, /#2.*1 项验收未勾选/);
  assert.match(result.stdout, /- \[ \] 历史只读/);
  assert.match(result.stdout, /已检查 2 个已关闭 Issue，状态或清单结构不合格 1 个，未勾选验收项 1 个/);
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
    for (const args of [[], ['--strict', '1']]) {
      const result = run(t, fixture, args);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /验收清单检查失败/);
      assert.match(result.stderr, fixture.error ? /GitHub authentication failed/ : /JSON/);
      assert.doesNotMatch(result.stdout, /已检查/);
    }
  }
});

test('帮助和非法参数无需访问 GitHub', t => {
  const fixture = { error: 'GitHub must not be called' };
  const help = run(t, fixture, ['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /用法/);
  assert.match(help.stdout, /--strict/);
  const missingTargets = run(t, fixture, ['--strict']);
  assert.equal(missingTargets.status, 2);
  assert.match(missingTargets.stderr, /严格模式必须指定至少一个 Issue 编号/);
  assert.doesNotMatch(missingTargets.stderr, /GitHub must not be called/);
  for (const argument of ['0', '-1', '3;echo', '--repo']) {
    for (const args of [[argument], ['--strict', argument]]) {
      const result = run(t, fixture, args);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Issue 编号必须是正整数/);
      assert.doesNotMatch(result.stderr, /GitHub must not be called/);
    }
  }
});
