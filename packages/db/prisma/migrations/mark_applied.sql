INSERT INTO "_prisma_migrations" (
  "id",
  "checksum",
  "finished_at",
  "migration_name",
  "logs",
  "rolled_back_at",
  "started_at",
  "applied_steps_count"
) VALUES (
  gen_random_uuid()::TEXT,
  'manually-applied',
  NOW(),
  '20260328220000_redesign_courses',
  NULL,
  NULL,
  NOW(),
  1
)
;
