import { execFileSync } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';
import MarkdownIt from 'markdown-it';

const repository = 'eric03742/habit-tracker';
const markdown = new MarkdownIt();

function readGitHub(args) {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
}

function acceptanceItems(body) {
  // 代码块的缩进取决于列表层级，用 Markdown 块的行区间排除示例。
  const codeLineNumbers = new Set();
  for (const token of markdown.parse(body, {})) {
    if (token.type === 'fence' || token.type === 'code_block') {
      for (let index = token.map[0]; index < token.map[1]; index++) codeLineNumbers.add(index);
    }
  }
  let sectionLevel = 0;
  let found = false;
  let total = 0;
  const pending = [];
  for (const [index, line] of body.split(/\r\n?|\n/).entries()) {
    if (codeLineNumbers.has(index)) continue;
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (heading[1].length <= sectionLevel) sectionLevel = 0;
      if (/^(Acceptance criteria|验收标准|验收清单)$/i.test(heading[2])) {
        if (!sectionLevel) sectionLevel = heading[1].length;
        found = true;
      }
    }
    const item = line.match(/^\s*(?:[-+*]|\d+[.)])\s+\[([ xX])\]\s+(.+)$/);
    if (sectionLevel && item) {
      if (item[2].trim()) total++;
      if (item[1] === ' ') pending.push(item[2]);
    }
  }
  return { found, total, pending };
}

function audit() {
  const args = [...new Set(process.argv.slice(2))];
  if (args.length === 1 && args[0] === '--help') {
    console.log('用法：npm run check:issues [-- <Issue 编号> ...]\n严格收尾：npm run check:issues -- --strict <Issue 编号> ...\n普通模式只读检查已关闭 Issue 的未勾选验收项；不传编号则检查全部。\n严格模式必须指定编号，要求每个 Issue 已关闭、有有效验收条目且全部勾选。\n退出码：0 满足所选模式的检查条件，1 验收未完成或严格条件不满足，2 查询或参数错误。');
    return 0;
  }
  const strict = args.includes('--strict');
  const numbers = args.filter(argument => argument !== '--strict');
  if (numbers.some(number => !/^[1-9]\d*$/.test(number))) throw new Error('Issue 编号必须是正整数。');
  if (strict && !numbers.length) throw new Error('严格模式必须指定至少一个 Issue 编号。');
  const issues = numbers.length
    ? numbers.map(number => readGitHub(['issue', 'view', number, '--repo', repository, '--json', 'number,title,url,state,body']))
    : readGitHub(['api', '--paginate', '--slurp', `repos/${repository}/issues?state=closed&per_page=100`]).flat().filter(issue => !issue.pull_request);

  let checked = 0;
  let skipped = 0;
  let invalid = 0;
  let leftovers = 0;
  for (const issue of issues) {
    const { found, total, pending } = acceptanceItems(issue.body ?? '');
    const reason = issue.state.toUpperCase() !== 'CLOSED' ? '尚未关闭'
      : !found ? '没有可识别的验收标题'
      : strict && !total ? '没有有效的验收条目'
      : undefined;
    if (reason) {
      if (strict) {
        console.log(`#${issue.number} ${issue.title}：${reason}。\n${issue.html_url ?? issue.url}`);
        invalid++;
      } else {
        console.log(`跳过 #${issue.number}：${reason}。`);
        skipped++;
      }
      continue;
    }
    checked++;
    if (pending.length) {
      console.log(`#${issue.number} ${issue.title}：${pending.length} 项验收未勾选\n${issue.html_url ?? issue.url}`);
      for (const item of pending) console.log(`  - [ ] ${item}`);
      leftovers += pending.length;
    }
  }
  console.log(strict
    ? `严格模式：已检查 ${checked} 个已关闭 Issue，状态或清单结构不合格 ${invalid} 个，未勾选验收项 ${leftovers} 个。`
    : `已检查 ${checked} 个已关闭 Issue，跳过 ${skipped} 个，未勾选验收项 ${leftovers} 个。`);
  return leftovers || invalid ? 1 : 0;
}

try {
  process.exitCode = audit();
} catch (error) {
  console.error(`验收清单检查失败：${error.message}`);
  process.exitCode = 2;
}
