# Phase 14C: General Availability and Commercial Operations

Phase 14C adds the governed commercial architecture for Ghost Bridge. It does not launch production General Availability, charge a customer, contact a live payment or tax provider, send customer communication, or certify legal, tax, accounting, or regulatory compliance.

## Trust boundaries

Commercial access follows this fail-closed order:

1. authenticate identity;
2. resolve organization and workspace;
3. validate tenant, workspace, and subscription state;
4. resolve an active tenant-scoped grant and immutable entitlement definition;
5. validate commercial product availability and the capability launch gate;
6. validate region, residency, and compliance;
7. enforce RBAC;
8. enforce policy;
9. enforce allowance or quota;
10. enforce commercial kill switches;
11. return a bounded decision.

An entitlement never grants authorization by itself. It cannot bypass tenant isolation, RBAC, policy, capability gates, residency, compliance, quota, or kill switches. Private policy rules are not returned.

Product analytics and Phase 14B projections are advisory and are never invoice authority. Commercial usage originates only from authoritative operational records and explicit source transitions.

## Catalog, plans, and price books

`CommercialProduct`, `CommercialPlan`, `CommercialPriceBook`, `EntitlementDefinition`, `UsageMeterDefinition`, and `CommercialSupportTier` are versioned. Active versions are immutable. Products package gated capabilities. Plans pin products, entitlements, allowances, quota, overage, trial, cancellation, renewal, and support references. Price books pin explicit currency and deterministic charging items.

All money uses JavaScript safe integers in currency minor units. Floating-point money, arbitrary expressions, executable JavaScript, customer-defined metering code, and API-supplied database pipelines are forbidden. Price tiers are ordered and non-overlapping. Calculations always use an explicit price-book version.

`external.grounded_research` remains commercially blocked. It cannot activate as a GA product, enter an active plan or grant, enter a GA rollout, become billable usage, or appear on an invoice. Gemini remains `blocked_provider_unavailable`; external-flow verification remains deferred.

## Customers, contracts, and subscriptions

`CommercialCustomerProfile` stores safe contact and owner references, never payment-card or bank credentials. `BillingAccount` stores provider references, not provider secrets or unrestricted payment data.

Subscriptions pin plan and price-book versions and use an explicit state graph:

`draft → pending_approval/scheduled/trialing → active → paused/past_due/suspended/cancelling → cancelled/terminated`

Illegal transitions fail closed. Plan changes require approval, explicit old and new versions, and deterministic integer-minor-unit proration. Trials use an injected clock and explicit scheduled, active, extended, converted, expired, and cancelled states.

Quotes are versioned and transition through validation, approval, presentation, acceptance, and conversion. Orders use scoped idempotency and stable provisioning digests, so replay cannot provision twice. Contract records contain references and bounded summaries, never unrestricted contract content. Terms and policy acceptances pin accepted versions and preserve withdrawal or supersession history.

## Authoritative usage and allowances

`CommercialUsageRecord` is append-only and scoped by organization, workspace, billing account, and subscription. Scoped idempotency and deduplication digests prevent duplicate execution or source-transition replay from double billing.

Normal billability requires a successful/completed authoritative outcome under an active pricing rule. These outcomes are excluded:

- provider-unavailable work;
- capability-gate, policy, quota, or tenant denials;
- failed, rejected, or cross-tenant work;
- test and simulation fixtures;
- grounded research;
- cancelled, compensated, or rolled-back work unless a separately approved active rule explicitly permits it.

Usage adjustments are append-only and reference the original record and evidence digest. Allowances calculate used, remaining, and overage quantities deterministically. Overage modes are `block`, `allow`, `allow_approved`, `soft_limit`, and `manual`. Seat assignments are tenant scoped and deduplicated per user.

Usage projections are resumable and idempotent but remain non-authoritative. Metering reconciliation compares the authoritative ledger with each billing period. Any missing, duplicate, or mismatched item blocks invoice finalization until an append-only adjustment resolves it.

## Invoices, payments, and tax

Invoice previews pin currency, pricing versions, meter quantities, discounts, credits, and tax status. Fixed, seat, per-unit, volume-tier, graduated-tier, package, minimum-commitment, and manual items use deterministic integer arithmetic. Discounts use bounded fixed amounts or basis points. Credits cannot reduce a charge below zero.

Invoices move through draft, calculation, approval, finalization, issue, payment, past-due, refund, or void states. Reconciliation and approval are mandatory before finalization. Finalized invoice versions and line items are immutable. Corrections use refunds and credit notes; the original invoice is preserved.

Payment integration is provider neutral. Automated verification uses `MockPaymentAdapter` or `NoopPaymentAdapter` only. Webhooks require a verified signature and unique provider event ID; replay is acknowledged without repeating a state change. Refunds cannot exceed the successfully paid, not-yet-refunded amount.

Tax handling is manual/no-op in Phase 14C and records `manual_review_required` without an external call. Manual invoices, disputes, dunning, and payment plans are governed state records. Mock communications are prepared but never sent. Finance and revenue exports are tenant scoped and use safe JSON/manual/no-op adapters; no accounting platform is contacted.

## Customer lifecycle

Customer-success records cover onboarding, adoption, active use, risk, expansion, renewal, offboarding, and closure. Support tiers are immutable active versions. Renewal readiness considers term, contract, pricing, support, payment, adoption, and customer-success evidence. Recommendations remain advisory until approved.

Cancellation can be immediate or scheduled at period end; termination is separately governed. Offboarding preserves billing, audit, acceptance, invoice, payment, refund, dispute, decision, and evidence records under existing retention controls.

## GA readiness, rollout, and kill switches

GA stages are internal, staging, pilot, limited availability, general availability, suspended, and retired. `GaLaunchGate` reuses Phase 14A release, staging, pilot, provider, security, tenancy, database, capacity, support, and rollback evidence.

Readiness is `ready`, `ready_with_restrictions`, or `not_ready`. The verified Phase 14C fixture produces `ready_with_restrictions` for core orchestration and `blocked` for grounded research.

`GaRollout` is approval gated and percentage bounded. Phase 14C rollout execution is simulation only and never deploys or enables production. Tenancy, security, error-rate, payment, billing, and provider guardrails pause rollout. Rollback simulation preserves authentication, tenant isolation, RBAC, policy, gates, encryption, and audit.

Commercial kill switches can pause commercial access, subscriptions, usage recording, invoice finalization, payment collection, or rollout. They cannot disable authentication, audit, cancellation, recovery, evidence preservation, or security controls.

GA decisions are immutable, approval linked, and evidence referenced. Passing tests does not authorize production launch.

## API and governance integration

Authenticated APIs are mounted at `/api/commercial` and `/api/v1/commercial`; GA controls are at `/api/ga` and `/api/v1/ga`. Lists use bounded pagination and stable sorting. Tenant, workspace, billing-account, and subscription scope is applied where relevant. Mutations require idempotency.

Permission Registry v16 separates catalog, pricing, entitlements, customers, subscriptions, trials, quotes, orders, contracts, metering, billing, payments, disputes, dunning, tax, renewals, customer success, readiness, rollout, decisions, evidence, and exports. Ordinary users do not inherit price changes, manual grants, usage adjustments, invoice finalization, payments, refunds, credit notes, dispute resolution, dunning control, rollout control, provider override, or evidence export.

The existing policy engine remains in the authorization path. High-impact activation, manual grant, payment, refund, credit-note, plan-change, invoice, renewal, rollout, decision, and evidence operations consume existing approval grants. Audit records contain bounded summaries, tenant scope, request ID, and trace ID.

Metrics allow only bounded outcome, category, state, status, adapter, and reason labels. They never label organization, workspace, billing account, subscription, invoice, payment, user, request, trace, contract, or provider references.

## Console and migration

The compact light console adds Product Catalog, Plans & Pricing, Entitlements, Customers, Subscriptions, Usage & Metering, Invoices, Payments, Renewals, Customer Success, GA Readiness, Rollouts, Launch Decisions, and Commercial Evidence. It formats money from integer minor units, distinguishes billable/included/excluded/reversed/disputed usage, and visibly blocks grounded research.

The additive migration is idempotent, restart safe, rolling-deployment compatible, and non-destructive:

```text
npm run migrate:ga-commercial
```

The deterministic verifier uses only in-memory fixtures and mock/no-op/manual adapters:

```text
npm run verify:ga-commercial-readiness
```

It does not call an LLM, payment, tax, email, SMS, accounting, or deployment provider. It creates no real customer, invoice, payment, communication, or production rollout.

## Known limitations

- Gemini live verification remains blocked by an explicit upstream 503 response.
- External-flow verification remains deferred.
- Grounded research remains disabled, unavailable, non-entitled, and non-billable.
- Payment collection is mock/no-op/manual.
- Tax status is manual review.
- Communications are mock/no-op/manual and are not sent by verification.
- Finance exports do not contact an accounting platform.
- Automated readiness is operating evidence, not launch authorization or certification.
