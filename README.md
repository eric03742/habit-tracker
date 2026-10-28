# 日常 · 习惯追踪

一个在本机浏览器中使用的中文习惯追踪器。每天为跑步、早睡、阅读标记一次完成，记录保存在当前浏览器，无需账号或远程数据服务。

当前实现 [Issue #2：今日打卡与本地保存](https://github.com/eric03742/habit-tracker/issues/2)。历史日期查看和连续天数将在后续任务中提供。

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
- 刷新、关闭页面或正常关闭后重新打开浏览器，记录仍保留；新一天的记录不会覆盖旧日期。

记录保存在浏览器的 `localStorage`，仅属于同一浏览器、同一网站来源。请固定使用上述地址；`localhost` 与 `127.0.0.1`、不同端口或不同浏览器不会共享记录。清除网站数据会删除记录，无痕窗口不适合长期保存。

## 检查与测试

首次运行浏览器测试前安装 Chromium。Linux 或 CI 上用 `--with-deps` 同时安装系统依赖：

```bash
npx playwright install chromium
# Linux / CI：npx playwright install --with-deps chromium
npm run check
```

`npm run check` 依次执行 ESLint、TypeScript 类型检查，再通过 `npm test` 完成一次 Vite 生产构建和全部 Playwright 浏览器验收测试；任一步失败都返回非零退出码并停止后续步骤。

单独运行浏览器测试（每次先构建最新代码，再自动启动生产预览服务，测试端口为 4173；构建失败时不会运行测试）：

```bash
npm test
# 调试某个文件或查看报告
npm test -- tests/today.spec.ts
npx playwright show-report
```

测试通过浏览器页面的可见状态、正常点击、刷新和重新访问验证行为；日期场景使用 Playwright 受控时钟与时区。测试不直接读写底层存储，也不为内部函数单独编写测试。

GitHub Actions 在 PR 创建或更新、推送 `master` 时运行，使用 `npm ci`、`npx playwright install --with-deps chromium` 和同一条 `npm run check`。浏览器测试报告作为工作流产物保留 7 天。

## 代码位置

- `src/`：页面、记录规则及本地持久化。
- `tests/`：浏览器页面验收测试。
- `.github/workflows/check.yml`：统一检查工作流。
- `GLOSSARY.md`：领域术语及后续统计口径。
