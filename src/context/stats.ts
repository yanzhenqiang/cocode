// Stub: stats feature removed
export interface StatsStore { observe(name: string, value: number): void }
export function createStatsStore(): StatsStore { return { observe: () => {} } }
import type React from 'react'
export function StatsProvider({ children }: { children: React.ReactNode; store?: StatsStore }) { return children }
