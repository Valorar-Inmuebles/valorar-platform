-- Identity-scoped security state; deliberately independent of tenant selection.
CREATE TABLE "PasswordChangeRateLimit" (
  "userId" TEXT NOT NULL,
  "attemptedAt" TIMESTAMPTZ(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMPTZ(3)[],
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PasswordChangeRateLimit_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "PasswordChangeRateLimit_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PasswordChangeRateLimit_capacity_check" CHECK (
    cardinality("attemptedAt") <= 5
    AND (cardinality("attemptedAt") = 0 OR
      (array_ndims("attemptedAt") = 1 AND array_lower("attemptedAt", 1) = 1))
    AND array_position("attemptedAt", NULL) IS NULL
  )
);

CREATE INDEX "PasswordChangeRateLimit_expiresAt_idx"
  ON "PasswordChangeRateLimit"("expiresAt");
