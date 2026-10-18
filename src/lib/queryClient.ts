import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status?: number }).status;
          if (status === 400 || status === 401 || status === 403 || status === 404) {
            return false;
          }
        }
        return failureCount < 1;
      },
    },
  },
});
