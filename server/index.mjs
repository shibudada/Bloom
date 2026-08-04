import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

loadLocalEnv()

const PORT = Number.parseInt(process.env.BLOOM_API_PORT ?? '8787', 10)
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.4'
const PHOTON_AUTH_DOMAIN = process.env.PHOTON_AUTH_DOMAIN ?? 'https://auth.neutron.health'
const PHOTON_AUTH_AUDIENCE = process.env.PHOTON_AUTH_AUDIENCE ?? 'https://api.neutron.health'
const PHOTON_GRAPHQL_URL = process.env.PHOTON_GRAPHQL_URL ?? 'https://api.neutron.health/graphql'
const PHOTON_SITE_URL =
  process.env.PHOTON_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:5174'
const PHOTON_MCP_ENABLED = process.env.PHOTON_MCP_ENABLED !== 'false'
const PHOTON_MCP_URL = process.env.PHOTON_MCP_URL ?? 'https://ai.photon.health/mcp'
const PHOTON_MCP_AUTH_AUDIENCE = process.env.PHOTON_MCP_AUTH_AUDIENCE ?? PHOTON_AUTH_AUDIENCE
const PHOTON_MCP_SERVER_LABEL = process.env.PHOTON_MCP_SERVER_LABEL ?? 'photon'
const PHOTON_MCP_OAUTH_ISSUER =
  process.env.PHOTON_MCP_OAUTH_ISSUER ?? new URL(PHOTON_MCP_URL).origin
const PHOTON_MCP_OAUTH_REDIRECT_URI =
  process.env.PHOTON_MCP_OAUTH_REDIRECT_URI ??
  `${PHOTON_SITE_URL.replace(/\/+$/g, '')}/api/photon/mcp/oauth/callback`
const PHOTON_MCP_OAUTH_SCOPES = process.env.PHOTON_MCP_OAUTH_SCOPES ?? 'openid profile email'
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const photonMcpOAuthState = {
  metadata: null,
  client: null,
  preflight: null,
  pending: new Map(),
  token: null,
}

const PlanSectionSchema = z
  .object({
    heading: z.string().min(1),
    items: z.array(z.string().min(1)).min(1).max(6),
  })
  .strict()

const DraftPlanOutputSchema = z
  .object({
    title: z.string().min(1),
    rationale: z.string().min(1),
    sections: z.array(PlanSectionSchema).min(2).max(5),
    safetyChecks: z.array(z.string().min(1)).min(1).max(8),
    evidence: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict()

const DraftOrderOutputSchema = z
  .object({
    medication: z.string().min(1),
    sig: z.string().min(1),
    allergies: z.string().min(1),
    quantity: z.string().min(1),
    refills: z.string().min(1),
    daysSupply: z.string().min(1),
    pharmacy: z.string().min(1),
    notes: z.string().min(1),
    substitutions: z.string().min(1),
  })
  .strict()

const DraftPrescriptionOutputSchema = z
  .object({
    title: z.string().min(1),
    rationale: z.string().min(1),
    order: DraftOrderOutputSchema,
    safetyChecks: z.array(z.string().min(1)).min(1).max(8),
    evidence: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict()

const BLOOM_PLAN_AGENT_INSTRUCTIONS = `
You are Bloom's clinician-facing draft-plan copilot for asynchronous menopause care.

Return only a structured draft plan for clinician review. Do not claim that an order,
message, prescription, diagnosis, or chart update has been completed.

Use only the supplied chart snapshot. If information is missing, state that as a
safety check or plan item instead of inventing details. Be conservative with systemic
hormone therapy. Escalate postmenopausal bleeding, concerning contraindications,
new neurologic symptoms, severe pain, syncope, or unclear medication safety.

Keep the output concise and usable inside a chart note. Include patient-message
language as a draft section only when useful, and include the chart evidence you used.

When Photon MCP is available, use it only for read-only patient, medication, order,
or clinical context lookups that help the draft plan. Do not call mutation, write,
send, prescribe, close, cancel, or sign tools.
`

const BLOOM_PRESCRIPTION_AGENT_INSTRUCTIONS = `
You are Bloom's clinician-facing prescription draft copilot for asynchronous menopause care.

Return only a structured prescription candidate for clinician review. Do not claim
that a prescription has been sent, signed, transmitted, ordered, or written to an EHR.

Use only the supplied chart snapshot and read-only Photon context when available.
If clinicianPrompt is supplied, treat it as the primary requested prescription intent
and map it to the closest medication/template candidate, while still respecting the
chart safety constraints.
If the chart has a draft order that is clinically plausible, preserve its intent and
tighten the fields. If prescribing is unsafe or missing required information, return
an order with medication "No prescription drafted" and explain the blocker in the
rationale and safety checks.

For systemic estrogen in a patient with a uterus, include progesterone protection.
Do not draft systemic hormone therapy if there is unexplained postmenopausal bleeding,
active/unknown contraindication status, or an urgent safety flag. Prefer conservative
quantities and refills for new starts. This output is a draft card only; a clinician
must load it into Photon and complete the prescribing workflow.

When Photon MCP is available, use it only for read-only patient, medication, order,
pharmacy, allergy, or clinical context lookups. Do not call mutation, write, send,
prescribe, close, cancel, or sign tools.
`

function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue

    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const separator = trimmed.indexOf('=')
      if (separator === -1) continue

      const key = trimmed.slice(0, separator).trim()
      const rawValue = trimmed.slice(separator + 1).trim()
      if (!key || process.env[key] !== undefined) continue

      process.env[key] = rawValue.replace(/^["']|["']$/g, '')
    }
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

function sendHtml(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  })
  response.end(body)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
    })
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

function eventId() {
  return `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function nowLabel() {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

function photonPublicConfig() {
  const orgId = process.env.PHOTON_ORG_ID ?? process.env.NEXT_PUBLIC_PHOTON_ORG_ID
  const clientId =
    process.env.PHOTON_FRONTEND_CLIENT_ID ?? process.env.NEXT_PUBLIC_PHOTON_FRONTEND_CLIENT_ID
  const missing = []

  if (!orgId) missing.push('PHOTON_ORG_ID')
  if (!clientId) missing.push('PHOTON_FRONTEND_CLIENT_ID')

  return {
    ready: missing.length === 0,
    missing,
    config:
      orgId && clientId
        ? {
            orgId,
            clientId,
            siteUrl: PHOTON_SITE_URL,
            authDomain: PHOTON_AUTH_DOMAIN,
            authAudience: PHOTON_AUTH_AUDIENCE,
          }
        : null,
  }
}

function photonServerConfigStatus() {
  const missing = []
  if (!process.env.PHOTON_ORG_ID) missing.push('PHOTON_ORG_ID')
  if (!process.env.PHOTON_BACKEND_CLIENT_ID) missing.push('PHOTON_BACKEND_CLIENT_ID')
  if (!process.env.PHOTON_BACKEND_CLIENT_SECRET) missing.push('PHOTON_BACKEND_CLIENT_SECRET')
  return { ready: missing.length === 0, missing }
}

function parseCsv(value) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function normalizeAccessToken(value) {
  return value.replace(/^Bearer\s+/i, '').trim()
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '')
}

function randomUrlToken() {
  return base64Url(randomBytes(32))
}

function pkceChallenge(verifier) {
  return base64Url(createHash('sha256').update(verifier).digest())
}

function formBody(values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params
}

async function getPhotonAccessToken(audience = PHOTON_AUTH_AUDIENCE) {
  const response = await fetch(`${PHOTON_AUTH_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PHOTON_BACKEND_CLIENT_ID,
      client_secret: process.env.PHOTON_BACKEND_CLIENT_SECRET,
      audience,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Photon token exchange failed (${response.status}): ${details}`)
  }

  const payload = await response.json()
  return payload.access_token
}

async function getPhotonMcpOAuthMetadata() {
  if (photonMcpOAuthState.metadata) {
    return photonMcpOAuthState.metadata
  }

  const response = await fetch(`${PHOTON_MCP_OAUTH_ISSUER}/.well-known/oauth-authorization-server`)
  if (!response.ok) {
    throw new Error(`Photon MCP OAuth discovery failed with ${response.status}`)
  }

  const metadata = await response.json()
  photonMcpOAuthState.metadata = metadata
  return metadata
}

async function getPhotonMcpOAuthClient() {
  if (process.env.PHOTON_MCP_OAUTH_CLIENT_ID) {
    return {
      client_id: process.env.PHOTON_MCP_OAUTH_CLIENT_ID,
      client_secret: process.env.PHOTON_MCP_OAUTH_CLIENT_SECRET ?? null,
    }
  }

  if (photonMcpOAuthState.client) {
    return photonMcpOAuthState.client
  }

  const metadata = await getPhotonMcpOAuthMetadata()
  if (!metadata.registration_endpoint) {
    throw new Error(
      'Photon MCP OAuth registration endpoint is unavailable. Set PHOTON_MCP_OAUTH_CLIENT_ID.',
    )
  }

  const response = await fetch(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Bloom local copilot',
      redirect_uris: [PHOTON_MCP_OAUTH_REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: PHOTON_MCP_OAUTH_SCOPES,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Photon MCP OAuth client registration failed (${response.status}): ${details}`)
  }

  const client = await response.json()
  photonMcpOAuthState.client = client
  return client
}

function photonMcpAuthorizationUrl({ metadata, client, state, verifier }) {
  const authorizationUrl = new URL(metadata.authorization_endpoint)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('client_id', client.client_id)
  authorizationUrl.searchParams.set('redirect_uri', PHOTON_MCP_OAUTH_REDIRECT_URI)
  authorizationUrl.searchParams.set('scope', PHOTON_MCP_OAUTH_SCOPES)
  authorizationUrl.searchParams.set('state', state)
  authorizationUrl.searchParams.set('code_challenge', pkceChallenge(verifier))
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  return authorizationUrl
}

async function checkPhotonMcpOAuthReadiness() {
  const cached = photonMcpOAuthState.preflight
  if (cached && Date.now() - cached.checkedAt < 5 * 60 * 1000) {
    return cached
  }

  try {
    const metadata = await getPhotonMcpOAuthMetadata()
    const client = await getPhotonMcpOAuthClient()
    const authorizationUrl = photonMcpAuthorizationUrl({
      metadata,
      client,
      state: 'preflight',
      verifier: randomUrlToken(),
    })

    const proxyResponse = await fetch(authorizationUrl, { redirect: 'manual' })
    const authUrl = proxyResponse.headers.get('location')
    if (!authUrl) {
      throw new Error(`Photon OAuth preflight failed with ${proxyResponse.status}.`)
    }

    const authResponse = await fetch(authUrl, { redirect: 'manual' })
    const body = await authResponse.text()
    const hasCallbackMismatch =
      authResponse.status === 403 &&
      /Callback URL mismatch|redirect_uri is not in the list of allowed callback URLs/i.test(body)

    const preflight = hasCallbackMismatch
      ? {
          ready: false,
          checkedAt: Date.now(),
          issue: `Photon OAuth rejects the local callback URL. Ask Photon to add ${PHOTON_MCP_OAUTH_REDIRECT_URI} to the allowed callback URLs for the MCP/Auth0 application, or set PHOTON_MCP_OAUTH_REDIRECT_URI to an already allowed URL.`,
        }
      : { ready: true, checkedAt: Date.now(), issue: null }

    photonMcpOAuthState.preflight = preflight
    return preflight
  } catch (error) {
    const preflight = {
      ready: true,
      checkedAt: Date.now(),
      issue: error instanceof Error ? `Photon OAuth preflight unavailable: ${error.message}` : null,
    }
    photonMcpOAuthState.preflight = preflight
    return preflight
  }
}

async function beginPhotonMcpOAuth() {
  const readiness = await checkPhotonMcpOAuthReadiness()
  if (!readiness.ready) {
    throw new Error(readiness.issue)
  }

  const metadata = await getPhotonMcpOAuthMetadata()
  const client = await getPhotonMcpOAuthClient()
  const state = randomUrlToken()
  const verifier = randomUrlToken()

  photonMcpOAuthState.pending.set(state, {
    codeVerifier: verifier,
    client,
    createdAt: Date.now(),
  })

  const authorizationUrl = photonMcpAuthorizationUrl({ metadata, client, state, verifier })

  return authorizationUrl.toString()
}

async function completePhotonMcpOAuth({ code, state }) {
  const pending = photonMcpOAuthState.pending.get(state)
  if (!pending) {
    throw new Error('Photon MCP OAuth state expired or was not started by this Bloom server.')
  }

  photonMcpOAuthState.pending.delete(state)

  const metadata = await getPhotonMcpOAuthMetadata()
  const body = formBody({
    grant_type: 'authorization_code',
    code,
    redirect_uri: PHOTON_MCP_OAUTH_REDIRECT_URI,
    client_id: pending.client.client_id,
    client_secret: pending.client.client_secret,
    code_verifier: pending.codeVerifier,
  })
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Photon MCP OAuth token exchange failed (${response.status}): ${details}`)
  }

  const token = await response.json()
  photonMcpOAuthState.token = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    tokenType: token.token_type ?? 'Bearer',
    scope: token.scope ?? PHOTON_MCP_OAUTH_SCOPES,
    expiresAt: token.expires_in ? Date.now() + Number(token.expires_in) * 1000 : null,
    authenticatedAt: Date.now(),
  }

  return photonMcpOAuthState.token
}

async function refreshPhotonMcpOAuthTokenIfNeeded() {
  const token = photonMcpOAuthState.token
  if (!token?.refreshToken || !token.expiresAt || token.expiresAt - Date.now() > 60_000) {
    return token
  }

  const metadata = await getPhotonMcpOAuthMetadata()
  const client = await getPhotonMcpOAuthClient()
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  })

  if (!response.ok) {
    photonMcpOAuthState.token = null
    return null
  }

  const refreshed = await response.json()
  photonMcpOAuthState.token = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    tokenType: refreshed.token_type ?? token.tokenType,
    scope: refreshed.scope ?? token.scope,
    expiresAt: refreshed.expires_in ? Date.now() + Number(refreshed.expires_in) * 1000 : null,
    authenticatedAt: token.authenticatedAt,
  }

  return photonMcpOAuthState.token
}

async function photonMcpOAuthStatus() {
  const token = photonMcpOAuthState.token
  const readiness = token?.accessToken
    ? { ready: true, issue: null }
    : await checkPhotonMcpOAuthReadiness()

  return {
    enabled: PHOTON_MCP_ENABLED,
    authenticated: Boolean(token?.accessToken),
    authorizationSource: token?.accessToken ? 'runtime_oauth' : null,
    mcpUrl: PHOTON_MCP_URL,
    issuer: PHOTON_MCP_OAUTH_ISSUER,
    redirectUri: PHOTON_MCP_OAUTH_REDIRECT_URI,
    scopes: PHOTON_MCP_OAUTH_SCOPES,
    oauthReady: readiness.ready,
    oauthIssue: readiness.issue,
    tokenExpiresAt: token?.expiresAt ? new Date(token.expiresAt).toISOString() : null,
    authenticatedAt: token?.authenticatedAt
      ? new Date(token.authenticatedAt).toISOString()
      : null,
    connectUrl: '/api/photon/mcp/oauth/start',
  }
}

async function getPhotonMcpAuthorization() {
  const configuredToken = process.env.PHOTON_MCP_AUTHORIZATION ?? process.env.PHOTON_MCP_ACCESS_TOKEN

  if (configuredToken) {
    return {
      authorization: normalizeAccessToken(configuredToken),
      source: 'configured_token',
    }
  }

  const runtimeToken = await refreshPhotonMcpOAuthTokenIfNeeded()
  if (runtimeToken?.accessToken) {
    return {
      authorization: normalizeAccessToken(runtimeToken.accessToken),
      source: 'runtime_oauth',
    }
  }

  const status = photonServerConfigStatus()
  if (!status.ready) {
    return {
      authorization: null,
      source: null,
    }
  }

  return {
    authorization: await getPhotonAccessToken(PHOTON_MCP_AUTH_AUDIENCE),
    source: 'backend_client_credentials',
  }
}

function photonMcpAllowedTools() {
  const allowedToolNames = parseCsv(process.env.PHOTON_MCP_ALLOWED_TOOLS)

  if (allowedToolNames.length > 0) {
    return allowedToolNames
  }

  return { read_only: true }
}

function photonMcpApprovalPolicy() {
  if (process.env.PHOTON_MCP_REQUIRE_APPROVAL === 'always') {
    return 'always'
  }

  if (process.env.PHOTON_MCP_REQUIRE_APPROVAL === 'never') {
    return 'never'
  }

  return { never: { read_only: true } }
}

async function buildPhotonMcpTool() {
  if (!PHOTON_MCP_ENABLED) {
    return {
      tool: null,
      status: 'Photon MCP disabled by PHOTON_MCP_ENABLED=false.',
    }
  }

  const authorizationState = await getPhotonMcpAuthorization()

  if (!authorizationState.authorization) {
    return {
      tool: null,
      status:
        'Photon MCP not attached because no runtime Neutron login, PHOTON_MCP_AUTHORIZATION/PHOTON_MCP_ACCESS_TOKEN, or Photon backend client credentials are configured.',
    }
  }

  return {
    tool: {
      type: 'mcp',
      server_label: PHOTON_MCP_SERVER_LABEL,
      server_url: PHOTON_MCP_URL,
      server_description:
        'Photon Health MCP server for authenticated, read-only patient, medication, order, and care context lookups.',
      authorization: authorizationState.authorization,
      allowed_tools: photonMcpAllowedTools(),
      require_approval: photonMcpApprovalPolicy(),
    },
    status: `Photon MCP attached at ${PHOTON_MCP_URL} using ${authorizationState.source}.`,
  }
}

async function requestPhotonGraphql(query, variables) {
  const accessToken = await getPhotonAccessToken()
  const response = await fetch(PHOTON_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  const payload = await response.json()
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.map((error) => error.message).join('; ') ??
        `Photon GraphQL failed with ${response.status}`,
    )
  }

  return payload.data
}

async function syncPhotonPatientFromPayload({ consultId, patient }) {
  const existingPatientId = process.env.BLOOM_PHOTON_PATIENT_ID ?? process.env.PHOTON_PATIENT_ID

  if (existingPatientId) {
    return {
      id: existingPatientId,
      externalId: `bloom:configured-patient:${existingPatientId}`,
      source: 'configured-patient',
    }
  }

  const status = photonServerConfigStatus()
  if (!status.ready) {
    const error = new Error(`Missing Photon server config: ${status.missing.join(', ')}`)
    error.statusCode = 428
    throw error
  }

  if (!patient?.dateOfBirth || !patient?.phone) {
    const error = new Error(
      'Bloom patient seed is missing Photon-required dateOfBirth and phone. Set BLOOM_PHOTON_PATIENT_ID for sandbox testing or add full patient demographics.',
    )
    error.statusCode = 422
    throw error
  }

  const [firstName, ...restName] = String(patient.name ?? '').split(' ')
  const lastName = restName.join(' ') || 'Patient'
  const variables = {
    externalId: `bloom:${consultId}:patient:${patient.name}`,
    name: { first: firstName || 'Bloom', last: lastName },
    dateOfBirth: patient.dateOfBirth,
    sex: 'FEMALE',
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
  }
  const data = await requestPhotonGraphql(
    `mutation CreatePatient(
      $externalId: ID
      $name: NameInput!
      $dateOfBirth: AWSDate!
      $sex: SexType!
      $phone: AWSPhone!
      $email: AWSEmail
      $address: AddressInput
    ) {
      createPatient(
        externalId: $externalId
        name: $name
        dateOfBirth: $dateOfBirth
        sex: $sex
        phone: $phone
        email: $email
        address: $address
      ) {
        id
        externalId
      }
    }`,
    variables,
  )

  return { ...data.createPatient, source: 'created-patient' }
}

function buildChartSnapshot(consult) {
  const configuredPhotonPatientId =
    process.env.BLOOM_PHOTON_PATIENT_ID ?? process.env.PHOTON_PATIENT_ID ?? null

  return {
    consultId: consult.id,
    photon: {
      orgId: process.env.PHOTON_ORG_ID ?? process.env.NEXT_PUBLIC_PHOTON_ORG_ID ?? null,
      patientId: configuredPhotonPatientId,
      mcpServerLabel: PHOTON_MCP_SERVER_LABEL,
    },
    patient: {
      age: consult.patient?.age,
      pronouns: consult.patient?.pronouns,
      stage: consult.patient?.stage,
      location: consult.patient?.location,
      lastVisit: consult.patient?.lastVisit,
    },
    request: {
      title: consult.requestTitle,
      type: consult.requestType,
      activeProblem: consult.activeProblem,
      priority: consult.priority,
      receivedAt: consult.receivedAt,
      summary: consult.summary,
      currentNote: consult.note,
      tags: consult.tags,
      safetyFlags: consult.safetyFlags,
    },
    medications: {
      prescribed: consult.prescribedMedications,
      ehr: consult.ehrMedications,
      draftOrder: consult.draftOrder,
    },
    labs: consult.labs,
    conditions: consult.conditions,
    vitals: consult.vitals,
    timeline: consult.timeline,
    chat: consult.chat,
    followUps: consult.followUps,
  }
}

async function buildOpenAiPlanResponse(consult, prompt) {
  if (!openai) {
    return buildLocalAgentResponse('draft_plan', consult, [
      'OPENAI_API_KEY is not configured, so Bloom used the local deterministic stub.',
    ])
  }

  const { response, mcpStatus } = await runOpenAiWithOptionalPhotonMcp(
    consult,
    (targetConsult, tools) => createOpenAiDraftPlan(targetConsult, tools, prompt),
  )
  const parsed = response.output_parsed
  if (!parsed) {
    throw new Error('OpenAI returned no parsed draft plan output')
  }

  const actionCard = {
    id: eventId(),
    type: 'draft_plan',
    title: parsed.title,
    status: 'drafted',
    generatedAt: nowLabel(),
    rationale: parsed.rationale,
    sections: parsed.sections,
    safetyChecks: parsed.safetyChecks,
  }

  return {
    event: {
      id: eventId(),
      kind: 'action',
      label: 'Generated plan action card',
      body: [
        `Generated with ${OPENAI_MODEL} from the current Bloom chart snapshot.`,
        prompt ? `Clinician prompt: ${prompt}` : 'No freeform clinician prompt supplied.',
        mcpStatus,
        ...summarizeMcpActivity(response),
        `Evidence used: ${parsed.evidence.join('; ')}`,
        'No external EHR, prescribing, or patient-message side effects were performed.',
      ],
    },
    actionCard,
  }
}

async function buildOpenAiPrescriptionResponse(consult, prompt) {
  if (!openai) {
    return buildLocalAgentResponse('draft_prescription', consult, [
      'OPENAI_API_KEY is not configured, so Bloom used the local deterministic stub.',
    ])
  }

  const { response, mcpStatus } = await runOpenAiWithOptionalPhotonMcp(
    consult,
    (targetConsult, tools) => createOpenAiDraftPrescription(targetConsult, tools, prompt),
  )
  const parsed = response.output_parsed
  if (!parsed) {
    throw new Error('OpenAI returned no parsed prescription output')
  }

  const actionCard = {
    id: eventId(),
    type: 'draft_prescription',
    title: parsed.title,
    status: 'drafted',
    generatedAt: nowLabel(),
    rationale: parsed.rationale,
    order: parsed.order,
    safetyChecks: parsed.safetyChecks,
  }

  return {
    event: {
      id: eventId(),
      kind: 'action',
      label: 'Generated prescription action card',
      body: [
        `Generated with ${OPENAI_MODEL} from the current Bloom chart snapshot.`,
        prompt ? `Clinician prompt: ${prompt}` : 'No freeform clinician prompt supplied.',
        mcpStatus,
        ...summarizeMcpActivity(response),
        `Evidence used: ${parsed.evidence.join('; ')}`,
        'No prescription was sent. Load the draft into the Photon prescribing workspace for clinician review and transmission.',
      ],
    },
    actionCard,
  }
}

async function runOpenAiWithOptionalPhotonMcp(consult, createResponse) {
  const photonMcp = await buildPhotonMcpTool()
  const tools = photonMcp.tool ? [photonMcp.tool] : undefined

  try {
    return {
      response: await createResponse(consult, tools),
      mcpStatus: photonMcp.status,
    }
  } catch (error) {
    if (!photonMcp.tool || !isMcpRetryableError(error)) {
      throw error
    }

    return {
      response: await createResponse(consult, undefined),
      mcpStatus: `${photonMcp.status} ${mcpRetryReason(error)} Bloom retried without Photon MCP.`,
    }
  }
}

async function createOpenAiDraftPlan(consult, tools, prompt) {
  return openai.responses.parse({
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: BLOOM_PLAN_AGENT_INSTRUCTIONS,
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            task: 'draft_plan',
            clinicianPrompt: prompt || null,
            chartSnapshot: buildChartSnapshot(consult),
          },
          null,
          2,
        ),
      },
    ],
    store: false,
    tools,
    text: {
      format: zodTextFormat(DraftPlanOutputSchema, 'bloom_draft_plan'),
    },
  })
}

async function createOpenAiDraftPrescription(consult, tools, prompt) {
  return openai.responses.parse({
    model: OPENAI_MODEL,
    input: [
      {
        role: 'system',
        content: BLOOM_PRESCRIPTION_AGENT_INSTRUCTIONS,
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            task: 'draft_prescription',
            clinicianPrompt: prompt || null,
            chartSnapshot: buildChartSnapshot(consult),
          },
          null,
          2,
        ),
      },
    ],
    store: false,
    tools,
    text: {
      format: zodTextFormat(DraftPrescriptionOutputSchema, 'bloom_draft_prescription'),
    },
  })
}

function isMcpRetryableError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes("Tool 'mcp' disabled") ||
    message.includes('/hosted-tools') ||
    message.includes('Error retrieving tool list from MCP server') ||
    message.includes('MCP server') ||
    message.includes('mcp')
  )
}

function mcpRetryReason(error) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("Tool 'mcp' disabled") || message.includes('/hosted-tools')) {
    return 'OpenAI hosted MCP tools are disabled for this organization.'
  }

  if (message.includes('Error retrieving tool list from MCP server')) {
    return 'Photon MCP tool listing failed.'
  }

  return 'Photon MCP was unavailable for this request.'
}

function summarizeMcpActivity(response) {
  const output = Array.isArray(response.output) ? response.output : []
  const toolListItems = output.filter((item) => item?.type === 'mcp_list_tools')
  const toolCalls = output.filter((item) => item?.type === 'mcp_call')
  const listErrors = toolListItems
    .map((item) => item.error)
    .filter((error) => typeof error === 'string' && error.length > 0)

  if (listErrors.length > 0) {
    return [`Photon MCP tool listing error: ${listErrors.join('; ')}`]
  }

  if (toolCalls.length === 0) {
    return ['Photon MCP call activity: no tools called for this draft.']
  }

  return [
    `Photon MCP calls: ${toolCalls
      .map((item) => `${item.name ?? 'unknown'} (${item.status ?? 'unknown'})`)
      .join(', ')}`,
  ]
}

function buildPlanAction(consult, prompt) {
  const safetyChecks = consult.safetyFlags?.length
    ? consult.safetyFlags
    : ['No new safety flags supplied in the current chart context']

  return {
    id: eventId(),
    type: 'draft_plan',
    title: `Draft plan: ${consult.activeProblem}`,
    status: 'drafted',
    generatedAt: nowLabel(),
    rationale:
      prompt
        ? `Generated from clinician prompt "${prompt}" plus the current chart context.`
        : 'Generated from the current request note, patient-reported history, medication list, labs, and safety flags available in the chart seed context.',
    sections: [
      {
        heading: 'Assessment',
        items: [
          `${consult.patient.name} is being reviewed for ${consult.activeProblem.toLowerCase()}.`,
          consult.summary,
        ],
      },
      {
        heading: 'Plan',
        items: planItemsFor(consult),
      },
      {
        heading: 'Patient message',
        items: [
          'A clinician is reviewing the request now.',
          'Patient should receive clear precautions and expected next steps after clinician signoff.',
        ],
      },
    ],
    safetyChecks,
  }
}

function buildPrescriptionAction(consult, prompt) {
  const order = prescriptionOrderFromPrompt(prompt, consult) ?? consult.draftOrder

  return {
    id: eventId(),
    type: 'draft_prescription',
    title:
      order.medication === 'No prescription drafted' || order.medication === 'No medication drafted'
        ? 'Prescription action held'
        : `Draft prescription: ${order.medication}`,
    status: 'drafted',
    generatedAt: nowLabel(),
    rationale:
      order.medication === 'No prescription drafted' || order.medication === 'No medication drafted'
        ? 'The request has safety or missing-information constraints, so the medication action should remain held until clinician review.'
        : prompt
          ? `Matched the clinician prompt to Bloom prescription templates and generated a Photon-loadable draft.`
          : 'Generated from the current draft order, allergies, pharmacy preference, and request-specific safety checks.',
    order,
    safetyChecks: consult.safetyFlags?.length
      ? consult.safetyFlags
      : ['Medication list and allergies reviewed from available chart context'],
  }
}

function prescriptionOrderFromPrompt(prompt, consult) {
  const normalized = String(prompt ?? '').toLowerCase()
  if (!normalized.trim()) return null

  const templates = prescriptionTemplates()
  const matched = templates.filter((template) =>
    template.matchers.some((matcher) => normalized.includes(matcher)),
  )

  if (matched.length === 0) return null

  const unique = []
  for (const template of matched) {
    if (!unique.some((item) => item.name === template.name)) unique.push(template)
  }

  return {
    medication: unique.map((template) => template.name).join(' + '),
    sig: unique.map((template) => template.sig).join('; '),
    allergies: consult.draftOrder?.allergies ?? 'Review allergies before sending',
    quantity: unique.map((template) => template.quantity).join(' / '),
    refills: promptRefills(normalized) ?? consult.draftOrder?.refills ?? '0',
    daysSupply: promptDaysSupply(normalized) ?? consult.draftOrder?.daysSupply ?? '84',
    pharmacy: 'Patient selects preferred pharmacy from text link',
    notes:
      'Loaded from Bloom template library based on clinician prompt. Patient will receive a text link to choose pharmacy and insurance coverage.',
    substitutions: consult.draftOrder?.substitutions ?? 'Allow substitutions',
  }
}

function prescriptionTemplates() {
  return [
    {
      name: 'Estradiol Transdermal Patch 0.0375 MG/24HR',
      matchers: ['estradiol patch', 'estrogen patch', 'transdermal estradiol', 'patch'],
      sig: 'Apply 1 patch twice weekly',
      quantity: '24 patches',
    },
    {
      name: 'Progesterone Oral Capsule 100 MG',
      matchers: ['progesterone', 'prometrium'],
      sig: 'Take 1 capsule by mouth nightly',
      quantity: '90 capsules',
    },
    {
      name: 'Estradiol Vaginal Cream 0.01%',
      matchers: ['vaginal estrogen', 'vaginal estradiol', 'estradiol cream'],
      sig: 'Insert 1 g vaginally twice weekly at bedtime',
      quantity: '42.5 g',
    },
  ]
}

function promptRefills(prompt) {
  const match = prompt.match(/(\d+)\s*refills?/)
  return match?.[1] ?? null
}

function promptDaysSupply(prompt) {
  const match = prompt.match(/(\d+)\s*(day|days)/)
  return match?.[1] ?? null
}

function planItemsFor(consult) {
  if (consult.priority === 'Urgent') {
    return [
      'Do not approve hormone refill until postmenopausal bleeding evaluation is addressed.',
      'Advise patient to stop unsupervised systemic estrogen pending clinician review.',
      'Arrange diagnostic pathway and urgent precautions for heavy bleeding, severe pain, dizziness, or syncope.',
    ]
  }

  if (consult.requestType === 'Medication refill') {
    return [
      'Continue current maintenance therapy if clinician agrees with refill safety screen.',
      'Include symptom response, bleeding precautions, and when to re-contact the practice.',
      'Route signed refill and follow-up message after clinician approval.',
    ]
  }

  if (consult.requestType === 'Plan review') {
    return [
      'Send clarifying questions needed before medication recommendations.',
      'Offer non-prescription sleep and symptom-tracking plan now.',
      'Escalate to clinician visit if mood symptoms worsen or safety status changes.',
    ]
  }

  return [
    'Confirm contraindication screen and current preventive screening.',
    'Start the lowest reasonable dose if clinician agrees with hormone therapy plan.',
    'Schedule follow-up to assess symptom response, adverse effects, and dose adjustment needs.',
  ]
}

async function buildAgentResponse(actionType, consult, prompt) {
  if (actionType === 'draft_plan' && openai) {
    return buildOpenAiPlanResponse(consult, prompt)
  }

  if (actionType === 'draft_prescription' && openai) {
    return buildOpenAiPrescriptionResponse(consult, prompt)
  }

  const fallbackBody =
    actionType === 'draft_plan' || actionType === 'draft_prescription'
      ? ['OPENAI_API_KEY is not configured, so Bloom used the local deterministic stub.']
      : []

  return buildLocalAgentResponse(actionType, consult, fallbackBody, prompt)
}

function buildLocalAgentResponse(actionType, consult, extraBody = [], prompt) {
  const actionCard =
    actionType === 'draft_prescription'
      ? buildPrescriptionAction(consult, prompt)
      : buildPlanAction(consult, prompt)

  return {
    event: {
      id: eventId(),
      kind: 'action',
      label:
        actionType === 'draft_prescription'
          ? 'Generated prescription action card'
          : 'Generated plan action card',
      body: [
        ...extraBody,
        prompt ? `Clinician prompt: ${prompt}` : 'No freeform clinician prompt supplied.',
        'Reviewed the visible chart context and generated a structured clinician-review card.',
        'No external EHR, prescribing, or patient-message side effects were performed.',
      ],
    },
    actionCard,
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'bloom-api-stub' })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/photon/config') {
    sendJson(response, 200, photonPublicConfig())
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/photon/mcp/oauth/status') {
    sendJson(response, 200, await photonMcpOAuthStatus())
    return
  }

  if (
    (request.method === 'GET' || request.method === 'POST') &&
    url.pathname === '/api/photon/mcp/oauth/start'
  ) {
    try {
      const authorizationUrl = await beginPhotonMcpOAuth()

      if (request.method === 'POST') {
        sendJson(response, 200, { ok: true, authorizationUrl })
        return
      }

      response.writeHead(302, { Location: authorizationUrl })
      response.end()
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Photon MCP OAuth start failed',
      })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/photon/mcp/oauth/logout') {
    photonMcpOAuthState.token = null
    photonMcpOAuthState.pending.clear()
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/photon/mcp/oauth/callback') {
    try {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const oauthError = url.searchParams.get('error')

      if (oauthError) {
        throw new Error(
          `${oauthError}: ${url.searchParams.get('error_description') ?? 'OAuth authorization failed'}`,
        )
      }

      if (!code || !state) {
        throw new Error('Photon MCP OAuth callback is missing code or state.')
      }

      await completePhotonMcpOAuth({ code, state })
      sendHtml(
        response,
        200,
        `<!doctype html>
<html>
  <head><title>Photon MCP connected</title></head>
  <body>
    <p>Photon MCP connected. You can close this window.</p>
    <script>
      window.opener?.postMessage({ type: 'bloom-photon-mcp-auth', ok: true }, '*');
      setTimeout(() => window.close(), 800);
    </script>
  </body>
</html>`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photon MCP OAuth callback failed'
      sendHtml(
        response,
        500,
        `<!doctype html>
<html>
  <head><title>Photon MCP connection failed</title></head>
  <body>
    <p>Photon MCP connection failed.</p>
    <pre>${escapeHtml(message)}</pre>
    <script>
      window.opener?.postMessage({ type: 'bloom-photon-mcp-auth', ok: false }, '*');
    </script>
  </body>
</html>`,
      )
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/photon/patient/sync') {
    try {
      const body = await readJson(request)
      const patient = await syncPhotonPatientFromPayload(body)
      sendJson(response, 200, { ok: true, patient })
    } catch (error) {
      sendJson(response, error.statusCode ?? 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Photon patient sync failed',
      })
    }
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/copilot/action') {
    try {
      const body = await readJson(request)
      const { actionType, consult } = body
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

      if (!consult || !['draft_plan', 'draft_prescription'].includes(actionType)) {
        sendJson(response, 400, {
          error: 'Expected body with consult and actionType draft_plan or draft_prescription',
        })
        return
      }

      sendJson(response, 200, await buildAgentResponse(actionType, consult, prompt))
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Unknown API stub error',
      })
    }
    return
  }

  sendJson(response, 404, { error: 'Not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Bloom API stub listening on http://127.0.0.1:${PORT}`)
})
