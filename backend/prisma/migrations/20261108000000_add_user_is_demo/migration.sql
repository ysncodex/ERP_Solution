ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- role was unique (one account per role); drop it whether it is a constraint or a plain index
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_key";
DROP INDEX IF EXISTS "users_role_key";

CREATE UNIQUE INDEX IF NOT EXISTS "users_role_isDemo_key" ON "users"("role", "isDemo");
