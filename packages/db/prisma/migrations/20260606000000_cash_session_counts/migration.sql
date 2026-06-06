CREATE TABLE "cash_session_counts" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "countedAmount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_session_counts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_session_counts_sessionId_method_currency_key"
  ON "cash_session_counts"("sessionId", "method", "currency");

CREATE INDEX "cash_session_counts_sessionId_idx"
  ON "cash_session_counts"("sessionId");

ALTER TABLE "cash_session_counts"
  ADD CONSTRAINT "cash_session_counts_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "cash_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
