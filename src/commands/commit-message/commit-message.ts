import type { LocalCommandCall } from '../../types/command.js'
import { getAttributionTexts } from '../../utils/attribution.js'
import { settingsChangeDetector } from '../../utils/settings/changeDetector.js'
import {
  getInitialSettings,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'

type ParsedCoAuthor = {
  name: string
  email: string
}

export const USAGE = [
  'Commit message attribution',
  'Controls only the attribution text appended after /commit messages.',
  'It does not set the commit title or summary.',
  '',
  'Usage:',
  '  /commit-message status',
  '  /commit-message off',
  '  /commit-message default',
  '  /commit-message set "Generated with Cocode using GPT-5.5"',
  '  /commit-message co-author "Name" name@example.com',
].join('\n')

function sanitizeSingleLine(value: string): string {
  return value
    .replace(/[\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}




function saveCommitAttribution(commit: string | undefined): string | null {
  const result = updateSettingsForSource('userSettings', {
    attribution: { commit },
  })
  if (result.error) {
    return 'Failed to update user settings. Check your settings file for syntax errors.'
  }
  settingsChangeDetector.notifyChange('userSettings')
  return null
}

function formatStatus(): string {
  const effective = getAttributionTexts().commit
  const configured = getInitialSettings().attribution?.commit
  const configuredText =
    configured === undefined
      ? 'default'
      : configured === ''
        ? 'off'
        : configured

  return [
    'Commit message attribution',
    `Configured: ${configuredText}`,
    `Effective: ${effective || 'off'}`,
  ].join('\n')
}

export const call: LocalCommandCall = async args => {
  const raw = args.trim()
  if (!raw || raw === 'status') {
    return { type: 'text', value: `${formatStatus()}\n\n${USAGE}` }
  }

  const [command = '', ...rest] = raw.split(/\s+/)
  const commandArg = rest.join(' ').trim()

  switch (command.toLowerCase()) {
    case 'off':
    case 'none':
    case 'disable': {
      const error = saveCommitAttribution('')
      if (error) return { type: 'text', value: error }
      return {
        type: 'text',
        value: 'Commit attribution disabled for future /commit messages.',
      }
    }

    case 'default':
    case 'reset':
    case 'on': {
      const error = saveCommitAttribution(undefined)
      if (error) return { type: 'text', value: error }
      return {
        type: 'text',
        value: 'Commit attribution reset to the Cocode default.',
      }
    }

    case 'set-attribution':
    case 'set':
    case 'custom': {
      const value = stripMatchingQuotes(commandArg)
      if (!value) return { type: 'text', value: USAGE }
      const error = saveCommitAttribution(value)
      if (error) return { type: 'text', value: error }
      return {
        type: 'text',
        value: `Commit attribution text appended by /commit set to:\n${value}`,
      }
    }

    case 'co-author':
    case 'coauthor': {
      const parsed = parseCoAuthor(commandArg)
      if (!parsed) return { type: 'text', value: USAGE }
      const trailer = formatCoAuthorTrailer(parsed.name, parsed.email)
      const error = saveCommitAttribution(trailer)
      if (error) return { type: 'text', value: error }
      return {
        type: 'text',
        value: `Commit co-author set to:\n${trailer}`,
      }
    }
  }

  return { type: 'text', value: USAGE }
}
