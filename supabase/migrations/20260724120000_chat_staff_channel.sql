-- Staff-role channels: one conversation per (member, channel) instead of one shared inbox per member.

CREATE TYPE chat_staff_channel AS ENUM ('admin', 'receptionist', 'trainer');

ALTER TABLE chat_conversations
  ADD COLUMN channel chat_staff_channel;

-- Existing threads were the shared "escribe a recepción" inbox.
UPDATE chat_conversations
SET channel = 'receptionist'
WHERE channel IS NULL;

ALTER TABLE chat_conversations
  ALTER COLUMN channel SET NOT NULL;

ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_member_id_key;

ALTER TABLE chat_conversations
  ADD CONSTRAINT chat_conversations_member_id_channel_key UNIQUE (member_id, channel);

CREATE INDEX idx_chat_conversations_channel_last_message
  ON chat_conversations (channel, last_message_at DESC);
