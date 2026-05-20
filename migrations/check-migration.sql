-- Verificar se a migration foi aplicada (colunas existem)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND table_schema = 'public'
  AND column_name IN ('description', 'performers', 'duration', 'age_restriction', 'organizer')
ORDER BY column_name;
