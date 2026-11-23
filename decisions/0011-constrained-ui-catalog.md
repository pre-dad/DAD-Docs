# 0011 — A constrained UI catalog for generated donor screens

- Status: accepted
- Date: 2026-11-22
- Scope: DAD-Main (owns the catalog and validator), DAD-iOS, DAD-Android and the web app (render it)

## Context

An AI could select and arrange pre-approved components and emit a structured JSON spec
that each platform renders with its own native components. The
fit evaluation of 2026-11-21 found all four repos a conditional fit, with three top risks:

1. **AI-written text near regulated copy.** Tax, receipt and attribution wording is
   counsel-approved, and the PRD allows published figures only.
2. **Component extraction.** Rendering needs reusable primitives that the apps do not
   have yet, and extracting them touches accessibility-tested screens.
3. **Parity and version skew.** Under [0009](0009-separate-native-apps.md) each app renders
   the spec itself, so every catalog change needs a contract release and matching renderers.

This decision fixes the contract for a pilot. Web and native renderers and a two-person
staff approval flow implement it. Automated AI authoring remains outside the implementation.

## Decision

DAD-Main publishes a UI catalog, `contracts/mobile/ui-catalog.json`, with a validator and
shared vectors. It ships in the mobile-foundation bundle.

- **Seven components, closed props.** Heading, Text, Metric, MetricGrid, Callout, List and
  LinkButton. MetricGrid holds only Metric; List holds Text or LinkButton. A spec is an
  ordered array of blocks. Unknown props on a known type are rejected.
- **Limits.** Two levels deep, 40 nodes, 12 metrics per grid.
- **Capped plain labels, not string keys.** Literal text exists only as a Heading title and
  a Callout title and body: at most 60 characters (160 for a Callout body), plain text,
  with no angle brackets, URL schemes, markdown link syntax or control characters.
  Text has no literal form. Every displayed number or data string comes from a `bind`.
  Staff approve each spec before donors see it.
- **Binding.** A `bind` is an RFC 6901 pointer into the `DonorDashboard` response only.
  The validator resolves it against that schema in `openapi.json` and requires a scalar
  (an array for List). Metric declares a `format` from a closed set: `integer`,
  `usd_minor`, `days`, `percent`.
- **One action.** LinkButton navigates to a path in `links.json` `account_paths` or
  `notification_paths`. There are no other actions and no external URLs.
- **Unknown types are valid and render nothing.** An older app drops a newer component
  instead of failing.
- **Versioning.** `catalog_version` starts at 1 and ships under the semver of
  [0003](0003-mobile-foundation-semver-promise.md): adding a component or an optional prop
  is minor; removing or changing one is major.

### Why

- **Capped labels over a string-key table.** A key table needs approved copy in every
  language on every platform and keeps Android's `strings.xml` guard intact, but costs one
  to two extra days and a copy-sync process. For a pilot, staff approval of short plain
  labels is enough, and the character caps and content rules keep a label from carrying a
  link, markup or long-form claim.
- **Binds, not values.** The model never writes a figure. Numbers come from the API, so a
  generated spec cannot state an amount the system does not hold, and null states (a null
  `rank` or `streak` is unknown, never zero) stay the renderer's job.
- **Dashboard response only.** One response bounds what a spec can reach and keeps the
  validator checkable against a single schema. Opening other read-only GETs is a later
  minor change.
- **Unknown renders nothing.** It makes additive evolution safe across the install base,
  matching the promise in 0003.
- **Shared vectors.** Valid and invalid specs with expected error codes let each
  renderer prove it agrees with the validator without a shared code base.

## What stays hand-coded on every platform

Checkout and payment method, sign-in and passkeys, account deletion, consent and legal
pages, counsel-approved wording, and QR check-in. The catalog has no component that can
express them and a bind cannot reach them.

## Cross-repo premise

| Premise | Owner | Consumer | Enforcement |
| --- | --- | --- | --- |
| Every bind in the catalog and vectors resolves in the `DonorDashboard` schema, and every navigate target is in `links.json`. | DAD-Main | Web, iOS and Android renderers | `node scripts/ui-catalog.mjs check` in `make check-mobile`, run by Main's CI; renaming a bound field fails it. |
| The catalog and vectors are in the bundle manifest. | DAD-Main | DAD-iOS, DAD-Android | Bundle digests and each app's `check-foundation` file list, updated at re-vendor. |
| Unknown types render nothing; displayed layouts pass the catalog rules. | DAD-Main validator and each app | Donors | Main validates on save, submission, approval and dashboard read; native validators use the shared vectors, and renderer tests cover fallback behavior. |
| A different staff publisher approves a spec before display. | DAD-Main staff tooling | Donors | The store and database constraint refuse self-approval; the dashboard serves only the live layout while `DONOR_INSIGHTS_ENABLED` is enabled. |

## Consequences

- Mobile-foundation 3.0.0 carries the catalog and vectors. Both native apps pin that
  release and verify the two files through `check-foundation.mjs`.
- The shipped catalog permits only `account_paths`, a subset of the paths this decision
  allows; notification-only paths are excluded.
- A new component, prop, format or caption is a catalog change with a version bump,
  vectors, and a renderer in every app.
- Catalog captions and link labels are fixed English strings shipped in the contract.
  Localizing them, and counsel review of that wording, are open.
