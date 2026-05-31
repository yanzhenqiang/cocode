// Stub: stats feature removed
export interface StatsStore {}
export function createStatsStore(): StatsStore { return {} }
import type React from 'react'
export function StatsProvider({ children }: { children: React.ReactNode; store?: StatsStore }) { return children }
