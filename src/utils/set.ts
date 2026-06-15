/**
 * Note: this code is hot, so is optimized for speed.
 */
/**
 * Note: this code is hot, so is optimized for speed.
 */
/**
 * Note: this code is hot, so is optimized for speed.
 */
export function every<A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean {
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}

/**
 * Note: this code is hot, so is optimized for speed.
 */