import { z } from 'zod';

/**
 * The frontend login UI is role-based (Owner / Manager) with a single password
 * field, so the API authenticates by role + password rather than email.
 * Demo access uses POST /auth/demo (role only, no password) and always maps to
 * a seeded read-only demo account for that role.
 */
export const loginSchema = z.object({
  role: z.enum(['owner', 'manager']),
  password: z.string().min(1, 'Password is required'),
});

export const demoLoginSchema = z.object({
  role: z.enum(['owner', 'manager']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type DemoLoginInput = z.infer<typeof demoLoginSchema>;
