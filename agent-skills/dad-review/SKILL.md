---
name: dad-review
description: Review DAD diffs and completed behavior changes for actionable defects, contract violations, and verification gaps. Use when reviewing a PR or checking completed implementation; skip prose-only and trivial cosmetic changes unless review is requested.
---

# Review a DAD change

Resolve this skill's real path when symlinked. Read the
[shared workflow](../../conventions/agent-workflow.md), target repo instructions,
the requested behavior, and the diff against its intended base. Identify the reviewed
revision and any uncommitted changes. Trace relevant callers and tests beyond the diff.

Review five dimensions, concentrating on material consequences:

- Correctness: intended behavior, error paths, cancellation/retry, concurrency, and
  independently derived expected results.
- Readability: misleading names or control flow that conceal defects or make the
  affected behavior materially harder to maintain. Do not turn taste into blockers.
- Architecture: ownership, existing abstractions, generated artifacts, and cross-repo
  contracts. Check the OpenAPI/native snapshot implications where applicable.
- Security: affected principal, protected resource, trust boundary, authorization,
  sensitive data exposure, and external inputs. Separate hardening suggestions from
  demonstrated vulnerabilities. This review does not initiate a full audit.
- Performance: unbounded work, query patterns, and hot paths affected by this change.
  Distinguish measured regressions from risks that still need measurement.

For financial changes, use the repository's financial checklist. Preserve independent
persisted-state verification and the existing acceptance policy. Inspect whether tests
would fail for the actual defect, rather than merely whether tests exist.

Report findings first, ordered by impact. Each finding names the file/line, concrete
trigger, consequence, evidence, and a focused remedy or missing verification. Keep
uncertain claims explicitly uncertain. Do not fabricate findings to fill a checklist.
If none are found, say so and state the scope and remaining test limitations.

Reviewing alone does not authorize edits, publication, merge, or deployment. If fixing
findings is already part of the task, fix and re-verify within that scope. A self-review
must be described as such; it is not evidence of independent review.
