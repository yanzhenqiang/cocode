/**
 * Default keybindings — minimal set.
 */
import type { KeybindingBlock } from './types.js'

export const DEFAULT_BINDINGS: KeybindingBlock[] = [
  {
    context: 'Global',
    bindings: {
      'ctrl+c': 'app:interrupt',
      'ctrl+o': 'app:toggleTranscript',
    },
  },
  {
    context: 'Chat',
    bindings: {
      escape: 'chat:cancel',
      enter: 'chat:submit',
      return: 'chat:submit',
      up: 'history:previous',
      down: 'history:next',
    },
  },
  {
    context: 'Autocomplete',
    bindings: {
      tab: 'autocomplete:accept',
      escape: 'autocomplete:dismiss',
      up: 'autocomplete:previous',
      down: 'autocomplete:next',
    },
  },
  {
    context: 'Confirmation',
    bindings: {
      y: 'confirm:yes',
      n: 'confirm:no',
      enter: 'confirm:yes',
      return: 'confirm:yes',
      escape: 'confirm:no',
    },
  },
  {
    context: 'HistorySearch',
    bindings: {
      escape: 'historySearch:accept',
      enter: 'historySearch:execute',
      return: 'historySearch:execute',
    },
  },
  {
    context: 'Select',
    bindings: {
      up: 'select:previous',
      down: 'select:next',
      enter: 'select:accept',
      return: 'select:accept',
      escape: 'select:cancel',
    },
  },
  {
    context: 'Scroll',
    bindings: {
      pageup: 'scroll:pageUp',
      pagedown: 'scroll:pageDown',
      'ctrl+home': 'scroll:top',
      'ctrl+end': 'scroll:bottom',
    },
  },
  {
    context: 'Task',
    bindings: {
      'ctrl+b': 'task:background',
    },
  },
]
