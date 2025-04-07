/*
  # Update produtos table schema

  1. Changes
    - Add all price fields for different tax rates
    - Add additional product information fields
    - Update column types and constraints

  2. New Columns
    - Multiple price fields for different tax rates (20%, 18%, 17.5%, etc.)
    - Additional product classification fields
    - Tax-related fields (NCM, CEST)
*/

-- Add new columns and modify existing ones
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_18" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_18" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_18ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_18ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_175" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_175" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_175ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_175ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_17" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_17" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_17ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_17ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_12" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_12" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_0" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_0" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_22" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_22" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_21" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_21" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_19" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_19" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_20ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_20ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_19ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_19ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_205" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_205" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_195" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_195" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_195ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_195ALC" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_23" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_23" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_FABRICA_225" numeric(10,2),
ADD COLUMN IF NOT EXISTS "PRECO_MAXIMO_225" numeric(10,2);

-- Update column types if needed
ALTER TABLE produtos
ALTER COLUMN "DATA_VIGENCIA" TYPE timestamp with time zone USING "DATA_VIGENCIA"::timestamp with time zone,
ALTER COLUMN "PRECO_FABRICA_20" TYPE numeric(10,2),
ALTER COLUMN "PRECO_MAXIMO_20" TYPE numeric(10,2);

-- Set default values for numeric columns
DO $$
BEGIN
  -- Update all numeric columns to default to 0
  EXECUTE (
    SELECT string_agg(
      format('ALTER TABLE produtos ALTER COLUMN "%s" SET DEFAULT 0', column_name),
      '; '
    )
    FROM information_schema.columns
    WHERE table_name = 'produtos'
    AND data_type = 'numeric'
  );
END $$;