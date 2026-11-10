# Agent guide — DAD-Docs

Cross-repo system documentation (topology, the mobile contract, conventions, ADRs). Start
with these; this file only adds what they do not say.

- **[README.md](README.md)** — the scope rule, the reading order, what does not go here.
  There is no CONTRIBUTING; the PR template carries the scope checklist.
- **[conventions/repos-and-branches.md](conventions/repos-and-branches.md)** — branching,
  branch protection, and "Committed docs vs working docs".
- **[decisions/README.md](decisions/README.md)** — the ADR index and what qualifies.
- **[conventions/agent-workflow.md](conventions/agent-workflow.md)** — shared skill routing,
  installation, invocation boundaries, and independent-review requirements. Use
  `dad-debug` for substantive defects and `dad-review` for completed behavior changes;
  design review and full security audits are explicitly invoked workflows.

## The gate (CI job `docs`, the required check on `main`)

```sh
node scripts/check-links.mjs .
node scripts/check-agent-skills.mjs
node --test scripts/setup-agent-skills.test.mjs
node --test agent-skills/dad-security-audit/references/cloudflare-security-audit/validate-findings.test.cjs agent-skills/dad-security-audit/references/cloudflare-security-audit/validate-coverage-ledger.test.cjs
node scripts/check-version-anchor.mjs architecture/mobile-contract.md   # advisory, never fails
```

The link check fails on a relative link to a path or `#heading` that does not exist.
Skill checks verify structure, retained upstream integrity, and local setup behavior;
they do not prove model routing or review quality. Neither check fetches external URLs
or verifies prose against code.
For optional local Codex discovery, use `node scripts/check-agent-discovery.mjs --cwd PATH`
after installing into that repository. It starts no model turn and is not a CI dependency.

## Branch and push discipline

- Work on `dev`; ship via `dev` → PR → `main`, merged with **"Create a merge commit"**,
  never squash or rebase. Never push to `main` directly.
- Run `git commit` and `git push` as two separate commands.

## Writing and shared-tooling rules

- Explain **why** (a constraint, a trade-off, a non-obvious behavior), not what the linked
  source already says. No commented-out text (git keeps history); a `TODO` names a tracked
  issue.
- Shared skill tooling is dependency-free Node.js. Keep setup local and explicit,
  preserve existing skills and tracked repository files, and test filesystem changes
  in disposable Git repositories. Do not run an audit as part of setup validation.

## Gotchas not written in the docs

- **Scope rule.** Only cross-repo or system-level facts belong here, in present tense. A
  single repo's build/test/run goes in that repo's README; link to it, do not copy it.
- **Never track working documents** (plans, status, findings, session notes). There is no
  `.gitignore` here, so `git add -A` would stage them: stage files by name. Keep them
  outside the tree or in the owning issue/PR.
- **ADRs are one file per decision**, `decisions/NNNN-slug.md` (next free number, currently
  0010), headed `# NNNN — Title` with `Status`, `Date`, `Scope` lines, then Context and
  Decision. Add each new one to the "Recorded decisions" list in `decisions/README.md`.
- **Change a decision by superseding it**, as 0007 does for 0001: new ADR with
  `Supersedes:`, old one marked `Status: superseded by …` and kept as history.
- **Each ADR names a cross-repo premise**, its owner, and where it is enforced.
- **Run the link check before pushing.** CI fails on any broken relative link, including
  ADR-to-ADR links and the index.
