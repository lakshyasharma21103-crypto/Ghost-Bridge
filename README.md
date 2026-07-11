# Agent Passport Runtime Gateway

One key to discover, connect, and invoke any compatible AI agent.

Agent Passport Runtime Gateway lets a partner platform register an Agent Passport, issue a one-time install key, and let a receiving platform resolve that key into a usable runtime connection. REST runtime invocation is available in v1.

Read the complete implementation, architecture, route, security, and verification report in [FINAL_IMPLEMENTATION_REPORT.md](FINAL_IMPLEMENTATION_REPORT.md).

## Quick Start

```powershell
npm run dev --workspace backend
npm run dev --workspace frontend
```

The backend defaults to `http://localhost:5001` and the frontend defaults to `http://localhost:5174`.

## Demo

With a reachable MongoDB instance configured in `Backend/.env`:

```powershell
npm run seed:demo
npm run verify:demo
```

The seed command prints the generated FlowAI Demo partner API key once. The verification command intentionally does not print partner keys, install keys, or runtime grants.

## Developer Sandbox

Available only when the backend runs with `NODE_ENV=development`.

```powershell
npm run seed:sandbox
npm run verify:sandbox
```

The sandbox seeds Developer Sandbox and Research Test Agent against the local mock REST runtime. Its Partner API key is printed only when the partner is first created and cannot be recovered later.
