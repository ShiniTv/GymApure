ALTER TABLE nutrition_plans
  ADD COLUMN training_block_id BIGINT REFERENCES member_training_blocks(id) ON DELETE SET NULL;

CREATE INDEX idx_nutrition_plans_training_block
  ON nutrition_plans (training_block_id);
