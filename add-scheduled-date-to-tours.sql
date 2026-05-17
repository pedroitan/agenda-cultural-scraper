-- Adiciona coluna scheduled_date à tabela tours
ALTER TABLE tours ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Atualiza os tours existentes de Salvador com as datas corretas
-- Roteiros de Sábado (17 de maio de 2026)
UPDATE tours
SET scheduled_date = '2026-05-17'
WHERE city = 'salvador'
  AND (title ILIKE '%sábado%' OR title = 'Pelourinho Boêmio');

-- Roteiros de Domingo (18 de maio de 2026)
UPDATE tours
SET scheduled_date = '2026-05-18'
WHERE city = 'salvador'
  AND title ILIKE '%domingo%';

-- Verificar resultado
SELECT id, title, scheduled_date, is_published FROM tours WHERE city = 'salvador';
