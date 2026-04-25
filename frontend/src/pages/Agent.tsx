import { useEffect, useState } from 'react'
import { api } from '../api/client'

type AgentStatus = {
  agents_running: number
  model_loaded: boolean
  note: string
}

export default function Agent() {
  const [status, setStatus] = useState<AgentStatus | null>(null)

  useEffect(() => {
    api.agentStatus().then(setStatus).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="page-title">Agent</h1>

      <div className="card">
        <p className="card-label">Model</p>
        <div className="status-row">
          <span className={`status-dot ${status?.model_loaded ? 'green' : 'grey'}`} />
          <span>{status?.model_loaded ? 'loaded' : 'not loaded'}</span>
        </div>
      </div>

      <div className="card">
        <p className="card-label">Running Agents</p>
        <p className="metric-value">{status?.agents_running ?? 0}</p>
      </div>

      <div className="card">
        <p className="note-text">
          Agent runtime integration is pending. Routes are wired — implementation comes next.
        </p>
      </div>
    </div>
  )
}
