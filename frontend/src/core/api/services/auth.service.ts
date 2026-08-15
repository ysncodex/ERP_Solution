import { api } from '../client';

// Type definitions for auth
export type AuthRole = 'owner' | 'manager' | 'visitor';

export interface LoginCredentials {
  /** Role-based login matches the backend `/auth/login` contract. */
  role: Exclude<AuthRole, 'visitor'>;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface User {
  id: string;
  name: string;
  role: string;
}

// Auth Service
export const authService = {
  // Login user (role + password)
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  /** Passwordless, read-only tour for LinkedIn / public demos. */
  loginAsVisitor: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/visitor');
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },

  // Verify token with backend.
  // Returns `false` ONLY when the backend definitively rejects the token
  // (401/403). Network errors, timeouts, or cold-start failures return `true`
  // so a temporary outage never logs the user out — any genuinely invalid
  // token will still be caught by the 401 handler on subsequent requests.
  verifyToken: async (): Promise<boolean> => {
    try {
      await api.get('/auth/verify');
      return true;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return true;
    }
  },
};
