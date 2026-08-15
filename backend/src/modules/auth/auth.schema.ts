import { z } from 'zod';

/**
 * The frontend login UI is role-based (Owner / Manager) with a single password
 * field, so the API authenticates by role + password rather than email.
 * Visitor explore uses POST /auth/visitor (no password).
 */
export const loginSchema = z.object({
  role: z.enum(['owner', 'manager']),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
