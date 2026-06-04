export type KeybindingContextName =
  | 'Global'
  | 'Chat'
  | 'Autocomplete'
  | 'Confirmation'
  | 'Help'
  | 'Transcript'
  | 'Task'
  | 'ThemePicker'
  | 'Settings'
  | 'Tabs'
  | 'Scroll'
  | 'Attachments'
  | 'Footer'
  | 'MessageSelector'
  | 'MessageActions'
  | 'ModelPicker'
  | 'Select'
  | 'Plugin'

export type KeybindingAction =
  | 'app:interrupt'
  | 'app:exit'
  | 'app:toggleTodos'
  | 'app:toggleTranscript'
  | 'app:toggleBrief'
  | 'app:toggleTerminal'
  | 'app:redraw'
  | 'app:globalSearch'
  | 'app:quickOpen'
  | 'history:previous'
  | 'history:next'
  | 'chat:cancel'
  | 'chat:thinkingToggle'
  | 'chat:submit'
  | 'chat:newline'
  | 'chat:imagePaste'
  | 'autocomplete:accept'
  | 'autocomplete:dismiss'
  | 'autocomplete:previous'
  | 'autocomplete:next'
  | 'confirm:yes'
  | 'confirm:no'
  | 'confirm:previous'
  | 'confirm:next'
  | 'confirm:nextField'
  | 'confirm:previousField'
  | 'confirm:toggle'
  | 'confirm:toggleExplanation'
  | 'tabs:next'
  | 'tabs:previous'
  | 'transcript:toggleShowAll'
  | 'transcript:exit'
  | 'task:background'
  | 'theme:toggleSyntaxHighlighting'
  | 'help:dismiss'
  | 'attachments:next'
  | 'attachments:previous'
  | 'attachments:remove'
  | 'attachments:exit'
  | 'footer:up'
  | 'footer:down'
  | 'footer:next'
  | 'footer:previous'
  | 'footer:openSelected'
  | 'footer:clearSelection'
  | 'footer:close'
  | 'messageSelector:up'
  | 'messageSelector:down'
  | 'messageSelector:top'
  | 'messageSelector:bottom'
  | 'messageSelector:select'
  | 'modelPicker:decreaseEffort'
  | 'modelPicker:increaseEffort'
  | 'modelPicker:refresh'
  | 'select:next'
  | 'select:previous'
  | 'select:accept'
  | 'select:cancel'
  | 'plugin:toggle'
  | 'plugin:install'
  | 'permission:toggleDebug'
  | 'settings:search'
  | 'settings:retry'
  | 'settings:close'
  | 'voice:pushToTalk'
  | `command:${string}`

export type ParsedKeystroke = {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

export type Chord = ParsedKeystroke[]

export type ParsedBinding = {
  action: string | null
  chord: Chord
  context: KeybindingContextName
}

export type KeybindingBlock = {
  bindings: Record<string, string | null>
  context: KeybindingContextName
}
