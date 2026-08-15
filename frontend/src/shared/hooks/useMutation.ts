import { useState } from 'react';

interface UseMutationReturn<T, V> {
  mutate: (variables: V) => Promise<T>;
  data: T | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Custom hook for mutations (POST, PUT, DELETE)
 * Usage: const { mutate, loading, error } = useMutation((data) => salesService.create(data));
 */
export const useMutation = <T, V = void>(
  mutationFn: (variables: V) => Promise<T>
): UseMutationReturn<T, V> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (variables: V): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(variables);
      setData(result);
      return result;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const errorMessage = axiosErr.response?.data?.message || 'Mutation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    mutate,
    data,
    loading,
    error,
    reset,
  };
};
