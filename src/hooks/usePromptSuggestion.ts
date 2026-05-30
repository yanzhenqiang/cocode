// Stub: PromptSuggestion service removed
const noop = () => {}

export function usePromptSuggestion(_props: {
  inputValue: string
  isAssistantResponding: boolean
}): {
  suggestion: string | null
  markAccepted: () => void
  markShown: () => void
  logOutcomeAtSubmission: (finalInput: string, opts?: { skipReset: boolean }) => void
} {
  return {
    suggestion: null,
    markAccepted: noop,
    markShown: noop,
    logOutcomeAtSubmission: noop,
  }
}
