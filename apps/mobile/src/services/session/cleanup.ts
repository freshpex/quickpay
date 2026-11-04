export async function clearPrivateState(
  cache: { cancelQueries: () => Promise<unknown>; clear: () => void },
  clearStorage: () => Promise<void>,
) {
  await cache.cancelQueries();
  cache.clear();
  await clearStorage();
}
