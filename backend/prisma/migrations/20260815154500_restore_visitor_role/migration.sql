-- Restore visitor role for passwordless, read-only demo access.

ALTER TYPE "Role" ADD VALUE 'visitor';
