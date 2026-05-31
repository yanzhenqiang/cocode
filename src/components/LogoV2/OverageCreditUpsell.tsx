// Stub: overage credit upsell removed
import type { FeedConfig } from './Feed.js'
export function isEligibleForOverageCreditGrant(): boolean { return false }
export function shouldShowOverageCreditUpsell(): boolean { return false }
export function maybeRefreshOverageCreditCache(): void {}
export function useShowOverageCreditUpsell(): boolean { return false }
export function incrementOverageCreditUpsellSeenCount(): void {}
export function OverageCreditUpsell(): React.ReactNode { return null }
export function createOverageCreditFeed(): FeedConfig { return {} as FeedConfig }
export function formatGrantAmount(): string | null { return null }
