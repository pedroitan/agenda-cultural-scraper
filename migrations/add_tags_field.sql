-- Adicionar campo 'tags' à tabela events
-- Execute no Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS tags text[];

-- Criar índice GIN para busca eficiente em arrays
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN (tags);

-- Adicionar comentário
COMMENT ON COLUMN events.tags IS 'Array de tags para categorização fina (ex: ["são joão", "forró", "junina"])';
