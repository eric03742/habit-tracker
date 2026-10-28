# 日常 · 习惯追踪

一个在本机浏览器中使用的中文习惯追踪器。每天为跑步、早睡、阅读标记一次完成，记录保存在当前浏览器，无需账号或远程数据服务。

已实现 [Issue #2：今日打卡与本地保存](https://github.com/eric03742/habit-tracker/issues/2)、[Issue #3：历史日期只读查看](https://github.com/eric03742/habit-tracker/issues/3)和 [Issue #4：每个习惯的当前与最长连续天数](https://github.com/eric03742/habit-tracker/issues/4)，覆盖[第一版规格 #1](https://github.com/eric03742/habit-tracker/issues/1)。

## 环境与启动

使用 Node.js 24.x（自带 npm），以及支持本地存储的现代电脑浏览器。`.nvmrc` 与 CI 均使用 Node.js 24。

```bash
npm ci
npm run dev
```

打开终端提示的 [http://127.0.0.1:5173](http://127.0.0.1:5173)。退出服务按 `Ctrl+C`，再次运行相同命令即可继续使用。

构建并预览生产版本：

```bash
npm run build
npm run preview
```

开发和生产预览使用相同地址与端口，请先停止另一个服务再启动；端口占用时命令会失败，不会悄悄换端口导致记录看似丢失。

## 记录规则

- 默认显示电脑本地的今天，三个固定习惯初始均为「未记录」，完成数为 0 / 3。
- 点击「标记完成」即创建当天的完成记录，不填数量或时长。每项每天最多一次，不能撤销、补记或提前记录。
- 三个习惯都按点击时所在时区的自然日归属，午夜零点换日；早睡没有特殊归属或自动判定。
- 页面停留跨日后会更新为新的今天，打卡时也会重新确定记录日。
- 使用「查看日期」选择过去日期，查看当天三个习惯的完成状态和完成数；空白日期显示三个「未记录」及 0 / 3。历史记录只读，未来日期不可选择。
- 点击「返回今天」或在日期选择器中选择今天，即可继续打卡。查看历史时跨日会保留所选日期；刷新或重新打开页面默认回到今天，可再次选择历史日期回看。
- 刷新、关闭页面或正常关闭后重新打开浏览器，记录仍保留；新一天的记录不会覆盖旧日期。
- 每张习惯卡分别展示「当前连续天数」和「最长连续天数」，无记录时均为 0，各习惯独立统计。
- 当前连续天数以今天为准：今天已完成时包含今天，尚未完成时保留截至昨天的连续天数；今天和昨天都没有记录时为 0。最长连续天数覆盖全部记录，不因中断而清零。
- 连续性按本地相邻自然日计算，正确跨越月界、年界和夏令时变化。打卡或本地日期变化后更新统计，切换历史日期不改变统计基准；刷新或重新打开浏览器后依据保留的完成记录重新计算。

例如，25、26、27 日连续完成，28 日尚未完成时显示当前 3 天、最长 3 天；28 日完成后均为 4 天。若漏掉 28 日，29 日打卡前显示当前 0 天、最长 3 天，打卡后显示当前 1 天、最长仍为 3 天。

记录保存在浏览器的 `localStorage`，仅属于同一浏览器、同一网站来源。请固定使用上述地址；`localhost` 与 `127.0.0.1`、不同端口或不同浏览器不会共享记录。清除网站数据会删除记录，无痕窗口不适合长期保存。

## 检查与测试

首次运行浏览器测试前安装 Chromium。Linux 或 CI 上用 `--with-deps` 同时安装系统依赖：

```bash
npx playwright install chromium
# Linux / CI：npx playwright install --with-deps chromium
npm run check
```

`npm run check` 依次执行 ESLint、TypeScript 类型检查、维护工具的离线命令行测试，再通过 `npm test` 完成一次 Vite 生产构建和全部 Playwright 浏览器验收测试；任一步失败都返回非零退出码并停止后续步骤。

单独运行浏览器测试（每次先构建最新代码，再自动启动生产预览服务，测试端口为 4173；构建失败时不会运行测试）：

```bash
npm test
# 调试某个文件或查看报告
npm test -- tests/today.spec.ts
npm test -- tests/streaks.spec.ts
npx playwright show-report
```

测试通过浏览器页面的可见状态、正常点击、刷新和重新访问验证行为；日期场景使用 Playwright 受控时钟与时区。测试不直接读写底层存储，也不为内部函数单独编写测试。

完整验收覆盖规格 #1 的打卡、历史只读和连续天数样例，也验证历史最长 5 天而当前 2 天、跨年、闰年二月、夏令时的 23 / 25 小时自然日，以及停留在今日或历史页面时跨午夜后的统计。

GitHub Actions 在 PR 创建或更新、推送 `master` 时运行，使用 `npm ci`、`npx playwright install --with-deps chromium` 和同一条 `npm run check`。浏览器测试报告作为工作流产物保留 7 天。

Issue 收尾时，可使用已登录的 GitHub CLI 只读检查已关闭 Issue 中遗漏勾选的验收项：

```bash
npm run check:issues          # 检查全部已关闭 Issue
npm run check:issues -- 3 4   # 仅检查指定 Issue
npm run check:issues -- --strict 1 2 3 4  # 关闭后严格核对指定 Issue
npm run test:tools           # 离线验证检查工具，无需 GitHub 登录
```

严格模式必须指定 Issue 编号，要求每个目标已关闭、在可识别的验收章节中至少有一条非空的任务列表条目，且所有验收项均已勾选；未满足条件返回退出码 1，参数或 GitHub 查询失败返回 2。普通模式继续报告跳过项。两种模式均只读，实际功能的通过证据仍需逐项核对。

证据核对、清单同步和检查命令的判定范围见 [Issue 工作流](docs/agents/issue-tracker.md#acceptance-closeout)。

## 代码位置

- `src/`：页面、记录规则及本地持久化。
- `tests/`：浏览器页面验收测试。
- `scripts/`：Issue 验收清单检查工具及其离线命令行测试。
- `.github/workflows/check.yml`：统一检查工作流。
- `GLOSSARY.md`：领域术语及统计口径。
