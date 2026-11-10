---
name: dad-design-review
description: Independently challenge an explicitly requested DAD design review, especially payments, identity, API/native contracts, or deployment changes. Review a design and referenced source in fresh contexts before consequential implementation.
---

# Review a DAD design independently

This workflow is explicitly invoked. Resolve the skill's real path and read the
[shared workflow](../../conventions/agent-workflow.md). Establish the target repo,
design, source revision, and the decisions the review must resolve. If no design
exists, draft a concise one in the target repo's ignored working directory using
the requirements already available. Ask only for missing facts that materially affect
the design. Drafting need not pause after every section.

The design should state intended behavior, invariants, affected contracts, failure
and retry behavior, rollout/recovery, unresolved questions, and executable verification.
Include the source reading list needed to judge those claims: target instructions,
product contracts, glossary, relevant ADRs, and affected code. Minimize unrelated context.

Use fresh subagents with no inherited conversation. Give each only this procedure,
the design, the reading list, and its review assignment. Do not pass the author's
reasoning, preferred conclusion, or other reviewers' findings. Use focused assignments
suited to the change, for example behavioral/failure cases and contract/implementation
fit; keep the number proportionate to scope and available budget. Reviewers inspect
source read-only and return evidence-backed findings without editing shared files.

Challenge unstated assumptions, contradictions, invalid state transitions, unsafe
retries, compatibility, and whether the verification plan could detect failure.
For payments, check transaction boundaries, idempotency, refunds, and provider event
ordering. For native contracts, check snapshot/version rollout. For infrastructure,
check authority, failure recovery, and cross-repo output consumers.

Reconcile findings against source and product intent, recording accepted changes,
rejected claims with reasons, unresolved decisions, and review scope. Revise the
design when authorized. Obtain the user's decision only for unresolved material
trade-offs; preserve approval already given for the work. Do not infer deployment
or API snapshot publication authority from design approval.

If fresh contexts are unavailable, state that independent design review could not run.
You may provide a labeled self-review, but never present it as an independent pass.
Do not treat agreement among reviewers as proof or a substitute for execution checks.
