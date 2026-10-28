import { execFileSync } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';

const repository = 'eric03742/habit-tracker';

function readGitHub(args) {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
}

function acceptanceItems(body) {
  let sectionLevel = 0;
  let found = false;
  let fence;
  const pending = [];
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (heading[1].length <= sectionLevel) sectionLevel = 0;
      if (/^(Acceptance criteria|验收标准|验收清单)$/i.test(heading[2])) {
        if (!sectionLevel) sectionLevel = heading[1].length;
        found = true;
      }
    }
    const item = line.match(/^\s*(?:[-+*]|\d+[.)])\s+\[ \]\s+(.+)$/);
    if (sectionLevel && item) pending.push(item[1]);
  }
  return { found, pending };
}

function audit() {
  const numbers = [...new Set(process.argv.slice(2))];
  if (numbers.length === 1 && numbers[0] === '--help') {
    console.log('用法：npm run check:issues [-- <Issue 编号> ...]\n只读检查已关闭 Issue 的验收清单；不传编号则检查全部。退出码：0 无遗漏，1 有遗漏，2 查询或参数错误。');
    return 0;
  }
  if (numbers.some(number => !/^[1-9]\d*$/.test(number))) throw new Error('Issue 编号必须是正整数。');
  const issues = numbers.length
    ? numbers.map(number => readGitHub(['issue', 'view', number, '--repo', repository, '--json', 'number,title,url,state,body']))
    : readGitHub(['api', '--paginate', '--slurp', `repos/${repository}/issues?state=closed&per_page=100`]).flat().filter(issue => !issue.pull_request);

  let checked = 0;
  let skipped = 0;
  let leftovers = 0;
  for (const issue of issues) {
    if (issue.state.toUpperCase() !== 'CLOSED') {
      console.log(`跳过 #${issue.number}：尚未关闭。`);
      skipped++;
      continue;
    }
    const { found, pending } = acceptanceItems(issue.body ?? '');
    if (!found) {
      console.log(`跳过 #${issue.number}：没有可识别的验收标题。`);
      skipped++;
      continue;
    }
    checked++;
    if (pending.length) {
      console.log(`#${issue.number} ${issue.title}：${pending.length} 项验收未勾选\n${issue.html_url ?? issue.url}`);
      for (const item of pending) console.log(`  - [ ] ${item}`);
      leftovers += pending.length;
    }
  }
  console.log(`已检查 ${checked} 个已关闭 Issue，跳过 ${skipped} 个，未勾选验收项 ${leftovers} 个。`);
  return leftovers ? 1 : 0;
}

try {
  process.exitCode = audit();
} catch (error) {
  console.error(`验收清单检查失败：${error.message}`);
  process.exitCode = 2;
}
