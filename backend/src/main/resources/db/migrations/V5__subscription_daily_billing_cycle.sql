-- Hibernate generates a check constraint for @Enumerated(STRING) columns, so the
-- new DAILY value must be admitted explicitly before it can be persisted.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_billing_cycle_check
    CHECK (billing_cycle IN ('MONTHLY', 'WEEKLY', 'DAILY'));
