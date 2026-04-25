import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Agent() {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [agents,      setAgents]      = useState<string[]>([])

  useEffect(() => {
    api.agentStatus()
      .then(s => { setAiAvailable(s.aiAvailable); setAgents(s.agents) })
      .catch(() => setAiAvailable(false))
  }, [])

  return (
    <div>
      <h1 className="page-title">Agent</h1>

      <div className="card">
        <p className="card-label">AI Status</p>
        <div className="status-row">
          <span className={`status-dot ${aiAvailable ? 'green' : 'grey'}`} />
          <span>{aiAvailable === null ? 'checking…' : aiAvailable ? 'ready' : 'no API key'}</span>
        </div>
      </div>

      <div className="card">
        <p className="card-label">Registered Agents</p>
        <p className="metric-value">{agents.length}</p>
      </div>
    </div>
  )
}
