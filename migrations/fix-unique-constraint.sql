-- Remove duplicatas (mantém o mais recente) antes de criar a constraint
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY source, external_id ORDER BY created_at DESC, id DESC) AS rn
  FROM events
  WHERE source IS NOT NULL AND external_id IS NOT NULL
)
DELETE FROM events
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Adiciona constraint UNIQUE(source, external_id) necessária para o upsert idempotente
ALTER TABLE events
  ADD CONSTRAINT events_source_external_id_unique UNIQUE (source, external_id);
