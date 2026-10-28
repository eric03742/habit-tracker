---
name: gitmoji
description: use when committing files and creating commits. Commit messages must use the actual Unicode gitmoji emoji, not the `:shortcode:` text form.
---

# Gitmoji Guide for AI Assistants

## Purpose

This guide helps AI assistants understand and use gitmoji convention when creating commits. Using emojis on commit messages provides an easy way of identifying the purpose or intention of a commit with only looking at the emojis used. Gitmoji use emojis to make commit messages more expressive and easier to understand at a glance.

## Official Specification

A gitmoji commit message is composed using the following pieces:

- **intention**: The intention you want to express with the commit, using the actual Unicode emoji from the gitmoji list. Do not use the `:shortcode:` text form.
- **scope**: A short string that adds contextual information for the scope of the change.
- **message**: A brief explanation of the change.

### Format

```
<intention> <scope>: <message>

[optional body]
```

**Language requirements**:

- Write `<scope>` in English.
- Write `<message>` and the optional body in Chinese.
- Preserve technical identifiers (e.g., API names and file paths) and issue-closing keywords (e.g., `Closes #123`) as needed.

## Gitmoji reference

Fetch all available gitmojis from: https://gitmoji.dev/api/gitmojis.

## Usage Guidelines for AI

### Selecting the correct emoji

1. **Identify the primary purpose** of the commit
2. **Choose the most specific emoji** that matches the change
3. **Use only one emoji** per commit for clarity
4. **Prioritize by impact**: Breaking changes (💥) > Features (✨) > Fixes (🐛) > Refactoring (♻️)

### Examples

```
✨ feat: 添加用户认证系统

基于 JWT 实现用户认证，提供登录和注册接口。
Closes #123
```

```
🐛 users: 修复用户服务中的空指针异常

在访问用户属性前添加空值检查，避免程序崩溃。
```

```
📝 docs: 更新安装说明

补充开发环境的详细配置步骤，便于开发者完成初始化。
```

```
⚡️ database: 添加索引以优化用户查询

通过复合索引将查询耗时从 500ms 降至 50ms。
```

```
💥 api: 统一 API 响应格式

所有 API 接口统一使用标准封装格式返回数据。
客户端必须同步更新响应解析逻辑。
```

## Best Practices

1. **Be atomic**: One emoji, one purpose, one commit
2. **Write clear subjects**: Keep under 60 characters, imperative mood
3. **Use the body**: Explain "why" not "what" for complex changes
4. **Reference issues**: Include issue numbers when applicable
5. **Indicate breaking changes**: Use the actual 💥 emoji.

## Resources

- Gitmojis list: https://gitmoji.dev/api/gitmojis
- Gitmoji website: https://gitmoji.dev/
- Gitmoji specification: https://gitmoji.dev/specification
