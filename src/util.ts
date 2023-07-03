/**
 * Reduce a map to a record. Optionally sort the entries before reducing.
 * @param map The map to reduce
 * @param sort The sort function to use, if any
 * @returns A record of the map's entries
 */
export function reduce<T = unknown>(
  map: Map<string, T>,
  sort?: (a: T, b: T) => number,
): Record<string, T> {
  const entries = [...map.entries()];
  const sortedEntries = sort
    ? entries.sort((a, b) => sort(a[1], b[1]))
    : entries;

  return sortedEntries.reduce(
    (acc, [type, data]) => ({
      ...acc,
      [type]: data,
    }),
    {} as Record<string, T>,
  );
}
