import { useState, useEffect } from 'react';
import { authService, type AuthRole, type User } from '@/core/api/services';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: Exclude<AuthRole, 'visitor'>, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

/**
 * Custom hook for authentication
 * Usage: const { user, isAuthenticated, login, logout } = useAuth();
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated on mount.
    // Keep the stored session on network/cold-start failures — only clear it
    // when verifyToken definitively rejects the token (401/403). The axios
    // interceptor remains the single source of truth for live 401 logouts.
    const checkAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return;

        const isValid = await authService.verifyToken();
        if (isValid) {
          setUser(currentUser);
        } else {
          authService.logout();
          setUser(null);
        }
      } catch (err) {
        // Transient errors should never wipe a valid local session.
        console.error('Auth check failed:', err);
        const currentUser = authService.getCurrentUser();
        if (currentUser) setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (role: Exclude<AuthRole, 'visitor'>, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login({ role, password });
      setUser(response.user);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };
};
