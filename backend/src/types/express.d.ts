import type { Role } from '../generated/prisma/enums.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware after a valid JWT is verified. */
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};
