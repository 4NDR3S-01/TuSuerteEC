-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discount_code_id" UUID,
ADD COLUMN     "subtotal" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by" UUID;

-- AlterTable
ALTER TABLE "raffle_entries" ADD COLUMN     "payment_transaction_id" UUID;

-- AlterTable
ALTER TABLE "raffles" ADD COLUMN     "closed_at" TIMESTAMPTZ(6),
ADD COLUMN     "draw_algorithm" TEXT,
ADD COLUMN     "draw_commitment" TEXT,
ADD COLUMN     "drawn_at" TIMESTAMPTZ(6),
ADD COLUMN     "entries_hash" TEXT,
ADD COLUMN     "terms" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspended_at" TIMESTAMPTZ(6),
ADD COLUMN     "suspension_reason" TEXT,
ADD COLUMN     "terms_accepted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "raffle_draw_secrets" (
    "raffle_id" UUID NOT NULL,
    "seed" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffle_draw_secrets_pkey" PRIMARY KEY ("raffle_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "data" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "folder" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_favorites" (
    "user_id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "reminded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffle_favorites_pkey" PRIMARY KEY ("user_id","raffle_id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "applies_to" TEXT NOT NULL DEFAULT 'all',
    "raffle_id" UUID,
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_user_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_redemptions" (
    "id" UUID NOT NULL,
    "code_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "discount_code_id" UUID,
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uploads_file_name_key" ON "uploads"("file_name");

-- CreateIndex
CREATE INDEX "uploads_owner_id_idx" ON "uploads"("owner_id");

-- CreateIndex
CREATE INDEX "raffle_favorites_raffle_id_idx" ON "raffle_favorites"("raffle_id");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_redemptions_transaction_id_key" ON "discount_redemptions"("transaction_id");

-- CreateIndex
CREATE INDEX "discount_redemptions_code_id_status_idx" ON "discount_redemptions"("code_id", "status");

-- CreateIndex
CREATE INDEX "discount_redemptions_user_id_idx" ON "discount_redemptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_rewards_referred_user_id_key" ON "referral_rewards"("referred_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_rewards_discount_code_id_key" ON "referral_rewards"("discount_code_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referrer_id_idx" ON "referral_rewards"("referrer_id");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_method_id_receipt_reference_idx" ON "payment_transactions"("payment_method_id", "receipt_reference");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_referral_code_key" ON "profiles"("referral_code");

-- CreateIndex
CREATE INDEX "raffle_entries_payment_transaction_id_idx" ON "raffle_entries"("payment_transaction_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_draw_secrets" ADD CONSTRAINT "raffle_draw_secrets_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_favorites" ADD CONSTRAINT "raffle_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_favorites" ADD CONSTRAINT "raffle_favorites_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Restricciones de integridad (Prisma no las modela, pero tampoco las elimina)
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_check" CHECK ("role" IN ('participant', 'staff', 'admin'));
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_status_check" CHECK ("status" IN ('draft', 'active', 'closed', 'drawn', 'completed'));
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_entry_mode_check" CHECK ("entry_mode" IN ('subscribers_only', 'tickets_only', 'hybrid'));
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_total_winners_check" CHECK ("total_winners" > 0);
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_ticket_price_check" CHECK ("ticket_price" IS NULL OR "ticket_price" >= 0);
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_max_entries_check" CHECK ("max_entries_per_user" IS NULL OR "max_entries_per_user" > 0);
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_amount_check" CHECK ("amount" > 0);
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_discount_check" CHECK ("discount_amount" >= 0);
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'completed', 'canceled'));
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_type_check" CHECK ("discount_type" IN ('percent', 'fixed'));
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_value_check" CHECK ("value" > 0 AND ("discount_type" <> 'percent' OR "value" < 100));
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_applies_to_check" CHECK ("applies_to" IN ('all', 'raffles', 'plans'));
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_status_check" CHECK ("status" IN ('pending', 'confirmed', 'released'));

-- Código de referido para los perfiles existentes
UPDATE "profiles" SET "referral_code" = upper(substr(md5(random()::text || "id"::text), 1, 8)) WHERE "referral_code" IS NULL;
