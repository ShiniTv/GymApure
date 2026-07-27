import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Standard optimistic mutation helpers (Linear-style instant UI).
 * Pattern: cancel → snapshot → patch → onError restore → onSettled invalidate.
 */

export async function optimisticSnapshot<T>(
  queryClient: QueryClient,
  queryKey: QueryKey
): Promise<T | undefined> {
  await queryClient.cancelQueries({ queryKey });
  return queryClient.getQueryData<T>(queryKey);
}

export function restoreOptimisticSnapshot(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previous: unknown
): void {
  if (previous !== undefined) {
    queryClient.setQueryData(queryKey, previous);
  }
}

export interface OptimisticContext<T> {
  previous: T | undefined;
  queryKey: QueryKey;
}

/** Apply a local patch, returning context for rollback. */
export async function applyOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (prev: T | undefined) => T
): Promise<OptimisticContext<T>> {
  const previous = await optimisticSnapshot<T>(queryClient, queryKey);
  queryClient.setQueryData<T>(queryKey, updater(previous));
  return { previous, queryKey };
}

export function rollbackOptimistic<T>(
  queryClient: QueryClient,
  context: OptimisticContext<T> | undefined
): void {
  if (!context) return;
  restoreOptimisticSnapshot(queryClient, context.queryKey, context.previous);
}
