SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_campaigns'
        AND COLUMN_NAME = 'purpose'
    ),
    'SELECT 1',
    'ALTER TABLE `message_campaigns` ADD COLUMN `purpose` ENUM(''MARKETING'', ''TRANSACTIONAL'', ''OTP'') NOT NULL DEFAULT ''MARKETING'' AFTER `send_mode`'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_logs'
        AND COLUMN_NAME = 'purpose'
    ),
    'SELECT 1',
    'ALTER TABLE `message_logs` ADD COLUMN `purpose` ENUM(''MARKETING'', ''TRANSACTIONAL'', ''OTP'') NOT NULL DEFAULT ''TRANSACTIONAL'' AFTER `recipient_value`'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_campaigns'
        AND INDEX_NAME = 'message_campaigns_purpose_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `message_campaigns_purpose_idx` ON `message_campaigns`(`purpose`)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_audiences'
        AND INDEX_NAME = 'message_audiences_campaign_id_recipient_value_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `message_audiences_campaign_id_recipient_value_idx` ON `message_audiences`(`campaign_id`, `recipient_value`)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_logs'
        AND INDEX_NAME = 'msg_logs_recipient_purpose_created_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `msg_logs_recipient_purpose_created_idx` ON `message_logs`(`channel_id`, `recipient_value`, `purpose`, `createdAt`)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'message_logs'
        AND INDEX_NAME = 'msg_logs_recipient_purpose_status_created_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `msg_logs_recipient_purpose_status_created_idx` ON `message_logs`(`channel_id`, `recipient_value`, `purpose`, `status`, `createdAt`)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
