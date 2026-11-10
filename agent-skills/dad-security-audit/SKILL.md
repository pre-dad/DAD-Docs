---
name: dad-security-audit
description: Run an explicitly requested, bounded DAD security audit with Cloudflare's coverage-led workflow and independent finding verification. Ordinary code review and security questions do not start this full audit.
---

# Audit a DAD security boundary

This workflow is explicitly invoked. Installation and discovery do not authorize an
audit. Resolve this skill's real path, then read the
[shared workflow](../../conventions/agent-workflow.md), target repo instructions,
and the complete [Cloudflare workflow](references/cloudflare-security-audit/workflow.md).
Its companion files, schemas, and validators are preserved alongside that workflow.
In those files, a reference to `SKILL.md` means `workflow.md` in that directory;
use that directory as the upstream skill directory for companion paths.

Apply the upstream six phases, write isolation, execution requirements, budgets,
independent verification, coverage ledger, and report validation. Establish the target,
pinned source, scope, available resources, and a new external private output directory
before starting. Honor user limits; mark unfinished coverage and validation explicitly.
Use existing authorization rather than repeatedly asking for routine steps.

DAD-specific boundaries:

- Read the relevant product contract and ADRs to establish intended behavior.
  Consider identity/authorization, payment and webhook ordering, native contracts,
  and ledger publishing only as relevant to the requested scope.
- Use fresh hunters and independent verifiers without inherited conversation; provide
  the required source and contract context. If independent contexts are unavailable,
  report that the full workflow cannot complete rather than silently self-verifying.
- Check the upstream OS-enforced execution controls before running target-controlled
  code. A worktree or ordinary container alone is not proof those controls exist.
  Missing controls leave execution-dependent leads needing validation. Do not weaken
  those requirements to obtain a result.
- Use synthetic local fixtures. No live payment providers, donor data, cloud account
  changes, production probes, deployments, or paid API calls are authorized by invoking
  this workflow alone. Follow any narrower target-repo rules.
- Keep reports and reproductions outside tracked product documentation. Audit records
  are supporting evidence, not ATM acceptance receipts. Do not publish to or change the
  ATM ledger, severity policy, workflows, or branch protection during an audit.

Run both upstream validators at their prescribed stages. Report confirmed findings,
rejected candidates, unresolved validation requirements, and coverage limitations
without treating a clean report as proof that the target is secure. Remediation is a
separate task unless the user already authorized it.
