/**
 * Pairs every processed node with its original counterpart by id.
 *
 * The compare table used to call `original.find()` for every processed node,
 * which is O(n²). Indexing the original list once makes the pairing O(n).
 * The index keeps the first node for a repeated id, matching `find()`.
 */
export type CompareNodePair<T> = [T, T | undefined];

export const pairCompareNodes = <T extends { id: unknown }>(
  processed: readonly T[],
  original: readonly T[],
): CompareNodePair<T>[] => {
  const originalById = new Map<unknown, T>();
  for (const node of original) {
    /* `find()` compares with ===, which never matches NaN; Map uses SameValueZero. */
    if (typeof node.id === 'number' && Number.isNaN(node.id)) {
      continue;
    }
    if (!originalById.has(node.id)) {
      originalById.set(node.id, node);
    }
  }

  return processed.map((node): CompareNodePair<T> => [node, originalById.get(node.id)]);
};
