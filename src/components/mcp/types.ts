// Shared types for MCP components

export type ServerInfo = {
  name: string
  client: {
    type: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled'
    name: string
    config: {
      scope: string
      type?: string
    }
  }
  scope: string
  transport?: string
  config?: unknown
}

export type AgentMcpServerInfo = {
  name: string
  needsAuth: boolean
  sourceAgents: string[]
}

export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'server-tool-detail'; server: ServerInfo; toolIndex: number }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }

// Remote server types
export type SSEServerInfo = ServerInfo & { transport: 'sse' }
export type HTTPServerInfo = ServerInfo & { transport: 'http' }

// Stdio server type
export type StdioServerInfo = ServerInfo & { transport: 'stdio' }
