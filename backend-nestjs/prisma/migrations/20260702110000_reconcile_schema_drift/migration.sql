-- Reconcile residual drift between the migration history and schema.prisma.
-- These three definitions existed in the schema (originally applied to the
-- source DB via `prisma db push`) but were never captured by a migration, so a
-- fresh `migrate deploy` produced a DB that differed slightly from the schema.
-- Generated with `prisma migrate diff --from-url <migrated-db> --to-schema-datamodel`.
-- Safe on a fresh database; the unique index requires no duplicate (channel_id,
-- store_id) rows in message_provider_configs if run against existing data.

ALTER TABLE `order_items` MODIFY `product_image_url` TEXT NULL;

ALTER TABLE `viettel_customers` MODIFY `send_date` DATETIME(3) NULL;

CREATE UNIQUE INDEX `message_provider_configs_channel_id_store_id_key` ON `message_provider_configs`(`channel_id`, `store_id`);
