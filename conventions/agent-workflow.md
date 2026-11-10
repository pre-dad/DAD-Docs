# Shared agent workflow

DAD-Docs owns the shared skills used across the DAD repositories. Repository
AGENTS.md files, contribution guides, product contracts, and ADRs remain authoritative
for local commands, behavior, and operational authority. The skills supply reusable
procedures rather than a second set of build or release rules.

## Product-family ownership

| Repository | Local guidance retained there |
|---|---|
| DAD-Main | Go/web tests, financial behavior, API generation, and ledger authority |
| DAD-Quality | Acceptance/discovery checks, evidence, and versioned policies |
| DAD-iOS | Xcode/Swift verification and the pinned native contract |
| DAD-Android | Gradle/lint verification and the pinned native contract |
| DAD-infra | Offline CDK verification and owner/pipeline deployment authority |
| DAD-website | Static/PHP checks and the staging/production deployment model |
| DAD-Docs (local directory `DAD-docs`) | Shared workflows, contracts, glossary, and ADRs |

Each active repo's agent guide points here instead of copying the shared procedures.
DAD-ImpactGraph has no committed product or agent guide; it is excluded from installation
until it becomes an active repository. Existing local working artifacts are never migrated
or reclassified by this setup.

## Routing

| Work | Skill | Invocation |
|---|---|---|
| Substantive bug, failing check, or performance regression | `dad-debug` | Automatic when relevant, or explicit |
| Review a diff or completed behavior change | `dad-review` | Automatic when relevant, or explicit |
| Independently challenge a consequential design | `dad-design-review` | Explicit only |
| Bounded security audit with independent verification | `dad-security-audit` | Explicit only |

After a substantive implementation, use `dad-review` before declaring the change
complete. Routine prose/cosmetic edits need no additional review ceremony. Existing
test gates remain required; review is not a substitute for them.

Payment, identity, API/native-contract, and deployment changes merit consideration
for independent design review. Flag that need when material design questions arise;
do not silently launch the explicit-only workflow. Ordinary security questions and
code review do not initiate an audit. Installing the pack never starts any workflow.

In Codex CLI/IDE, explicitly invoke a skill as `$dad-debug`, `$dad-review`,
`$dad-design-review`, or `$dad-security-audit`. In the desktop skill picker, select the
corresponding skill. Explicit-only policy is enforced through `agents/openai.yaml`;
the same boundary is stated in the instructions for hosts that do not support it.
See [official skill discovery and invocation documentation](https://learn.chatgpt.com/docs/build-skills).

## Installation and discovery

Requires Git and Node.js 20 or newer, with symlink support. From a stable DAD-Docs
checkout, install only into the explicit repository roots you select:

```sh
node scripts/check-agent-skills.mjs
node scripts/setup-agent-skills.mjs \
  --repo ../DAD-Main --repo ../DAD-Quality --repo ../DAD-iOS \
  --repo ../DAD-Android --repo ../DAD-infra --repo ../DAD-website \
  --repo ../DAD-docs --dry-run
```

Review the selected targets, then repeat without `--dry-run` to install; repeat with
`--check` to verify. Select a subset with fewer `--repo` arguments or add a
separate worktree as needed. Installation is local to each selected checkout;
independent worktrees require their own links. Codex scans repository `.agents/skills`
and follows symlinked skill folders. A link in the common parent of separate Git
repositories does not provide a reliable per-repo installation.

The setup script preflights all selected targets, refuses tracked destinations,
conflicting or broken links, and symlinked parent directories, then creates four
links under each target's `.agents/skills`. It adds exact local exclusion rules to
Git's `info/exclude`, preserving existing contents. It does not edit tracked
AGENTS.md files, repository configuration, or global user settings. The four skill
descriptions provide repo-local routing; each entrypoint links back to this shared
guidance. Existing installed skills are left intact.

The links reference the source checkout directly. Keep it available and on a reviewed
revision; updates to that checkout are immediately visible to installed skills. For
an isolated trial, use a retained review worktree and remove its links before deleting
it. To switch source checkouts, remove links using the original source checkout and
install from the new one; conflicting links are never overwritten automatically.

```sh
node scripts/setup-agent-skills.mjs --repo ../DAD-Main --remove --dry-run
node scripts/setup-agent-skills.mjs --repo ../DAD-Main --remove
```

Removal deletes only matching pack symlinks, leaving unrelated skills, directories,
and harmless local exclusion rules. Never repair a conflicting destination by
deleting an existing skill without first inspecting it.

`--check` verifies installed links, targets, and Git exclusion. The source check
verifies entrypoints, invocation policies, the absence of nested discoverable skills,
and retained upstream file hashes. These checks do not prove that a model chooses the
right workflow. In a new session inside each target repo (and an affected nested app),
inspect the skill picker: all four should be available, and the design/audit workflows
should require explicit invocation. Use representative tasks to assess actual routing
and output quality; record limitations rather than claiming behavioral validation
from file checks alone.

With Codex CLI installed, the optional local probe checks actual discovery at repo
roots and nested directories without starting a model turn:

```sh
node scripts/check-agent-discovery.mjs --cwd ../DAD-Main --cwd ../DAD-Main/apps/web
```

It starts a short-lived app server with a temporary Codex configuration directory,
calls `skills/list`, and requires exactly one enabled repository entry for each skill
from this source checkout. It does not inspect or reuse stored login credentials.
The app-server interface is experimental; run this probe locally rather than making
CI depend on an installed Codex version. Invocation policies are checked separately
because the skill-list response does not expose them.

## Independent review and evidence

Design reviews use fresh subagent contexts without the author's conversation. Give
reviewers the design and relevant source, instructions, contracts, glossary, and ADRs.
Audit hunters and verifiers follow the retained Cloudflare isolation and verification
protocol. Delegation is authorized within an invoked workflow's bounded scope. If the
host cannot provide fresh contexts, label any fallback as self-review and disclose
that independent review is unavailable.

Working drafts, reports, and findings stay in the owning repo's ignored working
directory or an explicitly selected private external directory. DAD-Docs has no
working-document ignore rule: keep its working artifacts outside the repo. Promote
durable cross-repo decisions through the existing ADR convention.

Audit reports are supporting evidence. They do not change the ATM ledger's publishing
trust model, acceptance policy, or release authority. See
[ADR 0006](../decisions/0006-one-findings-ledger.md). No audit, deployment, provider
interaction, or ledger publication is triggered by setup or discovery checks.

## Upstream maintenance

[upstream.json](../agent-skills/upstream.json) records reviewed source commits,
licenses, adaptation notes, and SHA-256 hashes for retained upstream files. Matt
Pocock's debugging ideas, Addy Osmani's review dimensions, and Google's fresh-context
design review are locally adapted; their complete instruction packs are not installed.
The Cloudflare security skill is retained in full with its license, companion files,
schema, validators, and tests. Its `SKILL.md` is stored as `workflow.md` to avoid
registering a second nested skill. The DAD audit wrapper explains that filename mapping.

Review upstream changes deliberately, preserve license notices and required companion
files, update the pinned provenance and hashes, and re-run the source, link, setup,
and retained-validator checks. Do not regenerate hashes merely to silence an unexplained
integrity failure. This pack adds no automatic upstream updater or CI model calls.
