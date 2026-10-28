# Bloom

Bloom is a seed-data prototype for an AI-first asynchronous menopause care chart. It is built as a React + Vite app so the clinician UI can be designed and tested before backend contracts are finalized.

## Current Surfaces

- Incoming asynchronous consult queue with search, priority, wait time, and status.
- Patient chart workspace with Request, Conditions, Labs, Medications, Notes, Procedures, and Vitals tabs.
- AI copilot panel with activity log, draft order review, follow-ups, internal notes, context stack, and prompt composer.
- Backend API stub for structured copilot action cards.
- Dark and light modes matched to the supplied chart screenshots.

## Seed Workflows

- HRT initiation for vasomotor symptoms.
- Postmenopausal bleeding safety escalation.
- Low-dose vaginal estrogen refill.
- Perimenopausal sleep and mood plan review.

## Commands

```bash
npm install
npm run dev
npm run dev:http
npm run build
npm run lint
```

The default local development URL is `https://localhost:3000/` so Photon Elements can run against HTTPS. For design review in browsers that block local HTTPS certificates, use `npm run dev:http` and open `http://localhost:3000/`. Photon prescribing remains blocked in HTTP mode by design. The API stub runs on `http://127.0.0.1:8787/`.

## Copilot Agent Harness

The frontend calls `POST /api/copilot/action` through `src/agent/client.ts`. The local stub in `server/index.mjs` returns structured JSON action cards for:

- `draft_plan`
- `draft_prescription`

When `OPENAI_API_KEY` is configured, `draft_plan` and `draft_prescription` use the OpenAI Responses API with strict Zod-backed structured output schemas. If no key is present, Bloom falls back to the deterministic local stub so the prototype still runs offline.

Optional environment:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
```

Photon MCP is attached to the OpenAI `draft_plan` request when the backend can authenticate it. By default the MCP server URL is `https://ai.photon.health/mcp` and Bloom requests only tools annotated as read-only.

Optional Photon MCP environment:

```bash
PHOTON_MCP_URL=https://ai.photon.health/mcp
PHOTON_MCP_AUTHORIZATION=...
PHOTON_MCP_ACCESS_TOKEN=...
PHOTON_MCP_ALLOWED_TOOLS=tool_a,tool_b
PHOTON_MCP_REQUIRE_APPROVAL=always|never
PHOTON_MCP_ENABLED=false
PHOTON_MCP_OAUTH_REDIRECT_URI=https://localhost:3000/api/photon/mcp/oauth/callback
PHOTON_MCP_OAUTH_CLIENT_ID=...
PHOTON_MCP_OAUTH_CLIENT_SECRET=...
```

If `PHOTON_MCP_AUTHORIZATION` or `PHOTON_MCP_ACCESS_TOKEN` is absent, Bloom attempts to authenticate the MCP request with the existing Photon backend client credentials:

```bash
PHOTON_ORG_ID=...
PHOTON_BACKEND_CLIENT_ID=...
PHOTON_BACKEND_CLIENT_SECRET=...
PHOTON_MCP_AUTH_AUDIENCE=https://api.neutron.health
```

For runtime Neutron login, the copilot panel includes a Photon MCP connection control. It starts an OAuth authorization-code + PKCE flow against `https://ai.photon.health`, stores the resulting token in the running local API process, and uses that token for subsequent OpenAI MCP requests. The token is not persisted to disk.

## Prescribing Flow

The copilot `Draft Rx` action generates a structured prescription candidate. Clicking `Load in prescribe` copies that candidate into the active chart draft order and opens the Rx drawer.

The actual prescription transmission path remains clinician-mediated:

1. Copilot drafts a prescription action card.
2. Clinician reviews and loads it into the Rx drawer.
3. Clinician opens the Photon prescribing workspace.
4. Photon Elements authenticates the clinician and runs the prescribing flow.
5. Bloom listens for Photon prescription events and can insert a prescription addendum into the chart note.

The agent does not send, sign, close, cancel, or transmit prescriptions directly. Photon MCP is currently attached for read-only context lookup only. If Photon MCP tool listing fails, Bloom retries the OpenAI draft without MCP and reports that status in the copilot activity log.
