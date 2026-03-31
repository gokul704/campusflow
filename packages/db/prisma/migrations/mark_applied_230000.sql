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
  '20260328230000_add_exam_grades_events_notifications',
  NULL,
  NULL,
  NOW(),
  1
);
