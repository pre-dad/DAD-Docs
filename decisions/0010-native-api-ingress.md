# 0010 — A distinct native API ingress

- Status: accepted
- Date: 2026-11-18
- Scope: DAD-Main, DAD-infra, DAD-iOS and DAD-Android

## Context

Native clients send bearer credentials and `X-DAD-Client: native` directly to the Go
API. Browser traffic uses the web application's `/api` proxy, which enforces browser
origin and cookie boundaries. Sharing that browser proxy prevents native requests
from reaching the API and mixes two authentication boundaries.

## Decision

Native clients use a distinct HTTPS API hostname. Main's nginx proxies only methods
and paths admitted by the native OpenAPI contract to the private API. The ingress
requires the native marker, rejects cookies and browser Origin headers, and retains
API authorization, request limits and structured errors. The marker is a routing
boundary; bearer authentication remains mandatory wherever the contract requires it.

The native hostname has no interactive browser challenge. Infrastructure's native
edge rule skips only Super Bot Fight Mode, preserving managed WAF and rate limits.
Free Bot Fight Mode is disabled for a zone serving native traffic because it cannot
be skipped. Browser links and associated domains keep the public web origin.

## Cross-repo premise

| Premise | Owner | Consumer | Enforcement |
| --- | --- | --- | --- |
| Admitted native methods and paths define the proxy allowlist. | DAD-Main OpenAPI | Main nginx | Generated allowlist drift check and ingress HTTP smoke tests. |
| nginx can reach private `api:8002` without a public API port. | DAD-infra | Main nginx | Security group, service dependency and configuration synthesis tests. |
| API and browser origins remain distinct. | DAD-iOS / DAD-Android | Native networking and links | Existing independent API/public origin configuration; Main rejects colliding ingress hosts. |
| DNS, certificates, origin pulls and edge policy are active before clients switch. | Deployment owner | All clients | Owner-run activation and deployed smoke checks; offline tests cannot prove live routing. |

Repo-local configuration and commands live in
[Main's edge guide](https://github.com/pre-dad/DAD-Main/blob/dev/docs/edge.md) and
[infra's README](https://github.com/pre-dad/DAD-infra/blob/dev/README.md#native-api-ingress).
