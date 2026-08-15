-- Remove visitor role: delete visitor users, rebuild Role enum without visitor.

DELETE FROM "users" WHERE "role" = 'visitor';

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "Role_new" AS ENUM ('owner', 'manager');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'owner'::"Role";
