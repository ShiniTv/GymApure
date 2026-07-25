ALTER TABLE user_routines
  ADD COLUMN training_block_id BIGINT REFERENCES member_training_blocks(id) ON DELETE SET NULL;

CREATE INDEX idx_user_routines_training_block
  ON user_routines (training_block_id);
