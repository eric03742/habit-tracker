# Issue tracker: GitHub

Issues and specs for this repo live in `eric03742/habit-tracker` on GitHub. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <body-file>`. Write multi-line issue, PR, and comment bodies to a temporary UTF-8 file and pass it with `--body-file`.
- **List issues / inspect project status**: start with `gh issue list --state open --limit 30 --json number,title,state,labels,url`, scoped with `--label` and `--state` as needed. This is a bounded discovery query, not an exhaustive audit. Fetch bodies only for selected issues; fetch comments only when their discussion matters.
- **Read a selected issue**: `gh issue view <number> --json number,title,body,state,url`. Add `labels` or `comments` when the task needs them. Reuse already-read content within the session; refresh the body immediately before editing it.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers only; 0 means startable). `gh issue view <n> --json blockedBy` also lists closed blockers, so filter it: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comment on an issue**: `gh issue comment <number> --body-file <body-file>`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: follow **Acceptance closeout** below, post the explanation with `gh issue comment <number> --body-file <body-file>`, then `gh issue close <number>`. On an already-closed issue, `gh issue close --comment` drops the comment and still exits 0.

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

Before the first tracker write of a session, check `gh repo view --json nameWithOwner`. The target must be `eric03742/habit-tracker`; use `--repo eric03742/habit-tracker` if the CLI resolves another repository. This also avoids writing to an upstream repository when working in a fork.

## Acceptance closeout

Use this when finishing an implemented issue, merging its PR, or updating an acceptance checklist. PR creation and issue closure are separate milestones; `Closes #N` may close an issue on merge without updating its checklist.

1. Read the selected issue and map each acceptance item to concrete evidence: the test/scenario, its passing run, or a recorded manual check. A passing CI run or merged PR alone does not prove every item. Record this mapping in the PR evidence or issue completion comment; reuse existing evidence when it still covers the delivered revision.
2. Fetch the latest issue body. Mark only evidenced acceptance items as complete, preserving other text and checklist sections. Save the updated UTF-8 body and use `gh issue edit <number> --body-file <body-file>`. Keep unverified items unchecked and report what remains.
3. Read the issue back and confirm both the checked items and the preserved content. Close only when every acceptance item is accounted for. If merging a PR with `Closes #N`, synchronize the checklist before merging, then verify the final issue state afterwards. For an already-merged PR, reconcile its linked issue the same way.
4. After closure, run `npm run check:issues -- --strict <number> ...`. Every named issue must be closed, contain at least one valid acceptance task item, and have no unchecked acceptance items. Resolve any reported failure before completing closeout; assess the actual evidence separately. A parent specification requires its own acceptance check even when its child issues are closed.

### Read-only checklist audit

`npm run check:issues` reads **all closed issues**, following GitHub API pagination and excluding PRs. `npm run check:issues -- 3 4` limits the audit to named issues. It uses the repository above explicitly, requires authenticated `gh`, and never edits or closes an issue.

The audit reports unchecked task items under `Acceptance criteria`, `验收标准`, or `验收清单` headings, including their subsections. It ignores fenced code examples and unrelated checklist sections. In ordinary mode, open issues and issues without a recognized acceptance heading are reported as skipped; an empty acceptance section has no unchecked items. Exit codes: **0** no leftovers, **1** unchecked acceptance items on closed issues, **2** invalid input or a GitHub/read failure.

For closeout, use `npm run check:issues -- --strict <number> ...` with at least one explicit issue number. Strict mode returns **1** if any target is open, lacks a recognized acceptance heading, has no valid acceptance task items, or has unchecked items. A valid item has a non-empty description and a checkbox (`[ ]`, `[x]`, or `[X]`) inside an acceptance section; prose, tables and fenced examples do not count. A missing target list or a query failure returns **2**. Both modes only inspect issue state and checklist structure; passing does not prove that a requirement works or that its evidence covers the delivered revision.

The live audit runs on demand during closeout; it is separate from `npm run check` so application CI stays independent of GitHub credentials and mutable issue state. The audit's offline command-line tests run in `npm run check`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number>`, then `gh pr view <number> --comments` (off a TTY, `--comments` prints only the comments, not the body), and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: see **Blocking** under Conventions.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (see **Count open blockers**, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body-file <answer-file>`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
