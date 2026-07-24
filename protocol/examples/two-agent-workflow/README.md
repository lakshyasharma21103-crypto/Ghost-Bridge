# Native two-agent workflow

This deterministic local example starts the Invoice Extraction Agent and
Accounting Agent, discovers and installs them through Ghost Bridge Native,
invokes invoice extraction, constrains the cross-agent payload with a Data
Contract, delegates two exact accounting capabilities, binds a human Approval
Decision, proves side-effect idempotency, validates Execution Receipts, and
enforces Connection revocation.

Run from the repository root:

```sh
npm run verify:ghostbridge-native-protocol
```

The workflow calls no model, paid provider, production database, or external
service.
