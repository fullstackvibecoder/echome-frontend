/**
 * Plain class joiner. It is NOT tailwind-merge: passing size, radius or width
 * utilities through `className` to a ds component will not reliably override
 * its base classes (both land in the same utility cascade and the winner is
 * decided by stylesheet order). Wrap the component in a sized element instead.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
