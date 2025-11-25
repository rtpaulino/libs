export function sync<A, B>({
  incoming,
  existing,
  matches,
  equals,
}: {
  incoming: A[];
  existing: B[];
  matches: (incomingItem: A, existingItem: B) => boolean;
  equals: (incomingItem: A, existingItem: B) => boolean;
}): {
  toBeCreated: A[];
  toBeUpdated: { original: B; updated: A }[];
  toBeDeleted: B[];
  unchanged: B[];
} {
  const toBeCreated: A[] = [];
  const toBeUpdated: { original: B; updated: A }[] = [];
  const unchanged: B[] = [];

  incoming.forEach((incomingItem) => {
    const existingItem = existing.find((existingItem) =>
      matches(incomingItem, existingItem),
    );

    if (existingItem) {
      if (equals(incomingItem, existingItem)) {
        unchanged.push(existingItem);
      } else {
        toBeUpdated.push({ original: existingItem, updated: incomingItem });
      }
    } else {
      toBeCreated.push(incomingItem);
    }
  });

  const toBeDeleted = existing.filter(
    (existingItem) =>
      !incoming.some((incomingItem) => matches(incomingItem, existingItem)),
  );

  return { toBeCreated, toBeUpdated, toBeDeleted, unchanged };
}
