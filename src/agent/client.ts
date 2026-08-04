import type { AgentActionResponse, AgentActionType, Consult } from '../types'

const API_BASE_URL = import.meta.env.VITE_BLOOM_API_BASE_URL ?? 'http://127.0.0.1:8787'

export interface AgentClient {
  createActionCard(input: {
    actionType: AgentActionType
    consult: Consult
    prompt?: string
  }): Promise<AgentActionResponse>
}

export const agentClient: AgentClient = {
  async createActionCard({ actionType, consult, prompt }) {
    const response = await fetch(`${API_BASE_URL}/api/copilot/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actionType, consult, prompt }),
    })

    if (!response.ok) {
      let message: string
      try {
        const errorBody = (await response.json()) as { error?: string }
        message = errorBody.error ?? `Agent request failed with ${response.status}`
      } catch {
        message = `Agent request failed with ${response.status}`
      }
      throw new Error(message)
    }

    return (await response.json()) as AgentActionResponse
  },
}
