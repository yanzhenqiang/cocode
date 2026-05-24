import { execFileNoThrow } from './execFileNoThrow.js'

const TMUX_COMMAND = 'tmux'

export interface TmuxMessenger {
  createSession(name: string, command: string, env?: Record<string, string>): Promise<void>
  sendKeys(sessionName: string, text: string): Promise<void>
  capturePane(sessionName: string): Promise<string>
  hasSession(sessionName: string): Promise<boolean>
  killSession(sessionName: string): Promise<void>
  attachSession(sessionName: string): Promise<void>
  listSessions(): Promise<string[]>
}

export const tmuxMessenger: TmuxMessenger = {
  async createSession(name: string, command: string, env?: Record<string, string>): Promise<void> {
    const args = ['new-session', '-d', '-s', name]
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        args.push('-e', `${key}=${value}`)
      }
    }
    args.push(command)
    const { code, stderr } = await execFileNoThrow(TMUX_COMMAND, args)
    if (code !== 0) {
      throw new Error(`Failed to create tmux session '${name}': ${stderr || 'Unknown error'}`)
    }
  },

  async sendKeys(sessionName: string, text: string): Promise<void> {
    const { code, stderr } = await execFileNoThrow(TMUX_COMMAND, [
      'send-keys', '-t', sessionName, text, 'Enter',
    ])
    if (code !== 0) {
      throw new Error(`Failed to send keys to tmux session '${sessionName}': ${stderr || 'Unknown error'}`)
    }
  },

  async capturePane(sessionName: string): Promise<string> {
    const { code, stdout, stderr } = await execFileNoThrow(TMUX_COMMAND, [
      'capture-pane', '-t', sessionName, '-p',
    ])
    if (code !== 0) {
      throw new Error(`Failed to capture pane for tmux session '${sessionName}': ${stderr || 'Unknown error'}`)
    }
    return stdout
  },

  async hasSession(sessionName: string): Promise<boolean> {
    const { code } = await execFileNoThrow(TMUX_COMMAND, ['has-session', '-t', sessionName])
    return code === 0
  },

  async killSession(sessionName: string): Promise<void> {
    const { code, stderr } = await execFileNoThrow(TMUX_COMMAND, ['kill-session', '-t', sessionName])
    if (code !== 0) {
      throw new Error(`Failed to kill tmux session '${sessionName}': ${stderr || 'Unknown error'}`)
    }
  },

  async attachSession(sessionName: string): Promise<void> {
    const { code, stderr } = await execFileNoThrow(TMUX_COMMAND, ['attach', '-t', sessionName])
    if (code !== 0) {
      throw new Error(`Failed to attach tmux session '${sessionName}': ${stderr || 'Unknown error'}`)
    }
  },

  async listSessions(): Promise<string[]> {
    const { code, stdout, stderr } = await execFileNoThrow(TMUX_COMMAND, [
      'list-sessions', '-F', '#{session_name}',
    ])
    if (code !== 0) {
      if (stderr?.includes('no server running')) {
        return []
      }
      throw new Error(`Failed to list tmux sessions: ${stderr || 'Unknown error'}`)
    }
    return stdout.split('\n').filter(s => s.trim().length > 0)
  },
}
