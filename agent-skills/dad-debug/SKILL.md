---
name: dad-debug
description: Diagnose DAD bugs, failing checks, and performance regressions using a reproducible failure and verified fix. Use for substantive debugging; skip routine edits and changes without a reported defect.
---

# Debug a DAD defect

Resolve this skill's real path when installed through a symlink. Read the
[shared workflow](../../conventions/agent-workflow.md) and the target repo's
AGENTS.md and contribution guide before changing source. Follow the relevant
product contract and ADRs; implementation behavior alone does not establish intent.

1. Establish the user's exact symptom and a repeatable pass/fail signal. Prefer an
   existing test, a minimal fixture, or a bounded local request/browser sequence.
   Record the command, source revision, and observed failure. For intermittent bugs,
   measure the failure rate and retain the seed or timing conditions.
2. Narrow the reproduction while preserving the symptom. Inspect source as needed
   to construct it. If reproduction is unavailable, distinguish source evidence from
   inference, state the missing fact, and propose the smallest way to verify it.
   Do not claim a verified fix without observing the relevant behavior.
3. For an ambiguous cause, compare plausible explanations and the observation that
   would distinguish them. Run targeted probes rather than accumulating speculative
   fixes. For performance regressions, measure a baseline before changing code.
4. Make the smallest effective fix. For behavior changes, prefer one failing test
   followed by one implementation slice. Test at an existing public boundary where
   possible; independent read-only database checks remain appropriate for persisted
   financial or identity outcomes. Do not require user approval for routine test choices.
5. Re-run the original reproduction and applicable repository checks. Remove temporary
   instrumentation. Report the cause, changed behavior, verification, and remaining
   limits. Add a regression test when it protects meaningful behavior; avoid tests
   that repeat the implementation or only validate a trivial reversible edit.

Keep captured data synthetic and reports in the repo's ignored working directory.
Do not contact live providers, add production instrumentation, or broaden the task
without the authorization required by the target repository.
