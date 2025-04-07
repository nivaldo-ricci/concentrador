/*
  # Create Pharmaceutical Products Schema

  1. New Tables
    - `pharmaceutical_products`
      - Primary key: `id` (uuid)
      - Unique constraint: `ean`
      - All fields mapped to match the specified schema
      - Proper data types for prices and dates
  
  2. Security
    - Enable RLS on pharmaceutical_products table
    - Add policies for:
      - Read access for authenticated users
      - Write access for authenticated users
*/

-- Create the pharmaceutical_products table
CREATE TABLE IF NOT EXISTS pharmaceutical_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ID_PRODUTO" TEXT NOT NULL,
  "EAN" TEXT UNIQUE NOT NULL,
  "REGISTRO_MS" TEXT NOT NULL,
  "NOME" TEXT NOT NULL,
  "APRESENTACAO" TEXT NOT NULL,
  "LABORATORIO" TEXT NOT NULL,
  "PRINCIPIO_ATIVO" TEXT NOT NULL,
  "ID_TIPO_PRODUTO" TEXT NOT NULL,
  "DESCRICAO_TIPO_PRODUTO" TEXT NOT NULL,
  "SUBTIPO_PRODUTO" TEXT,
  "ID_STATUS" TEXT NOT NULL,
  "DESCRICAO_STATUS" TEXT NOT NULL,
  "ID_TIPO_PRECO" TEXT NOT NULL,
  "DESCRICAO_TIPO_PRECO" TEXT NOT NULL,
  "ID_HOSPITALAR" TEXT NOT NULL,
  "DESCRICAO_HOSPITALAR" TEXT NOT NULL,
  "ID_TIPO_LISTA" TEXT NOT NULL,
  "DESCRICAO_TIPO_LISTA" TEXT NOT NULL,
  "DATA_VIGENCIA" TIMESTAMPTZ NOT NULL,
  "NCM" TEXT NOT NULL,
  "ID_TARJA" TEXT NOT NULL,
  "DESCRICAO_TARJA" TEXT NOT NULL,
  "CEST" TEXT NOT NULL,
  "PRECO_FABRICA_20" DECIMAL(10,2) NOT NULL,
  "PRECO_MAXIMO_20" DECIMAL(10,2) NOT NULL,
  "CLASSETERAPEUTICA" TEXT NOT NULL,
  "CODIGO_ATC" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE pharmaceutical_products ENABLE ROW LEVEL SECURITY;

-- Create indexes for frequently searched columns
CREATE INDEX IF NOT EXISTS idx_pharmaceutical_products_ean ON pharmaceutical_products ("EAN");
CREATE INDEX IF NOT EXISTS idx_pharmaceutical_products_registro_ms ON pharmaceutical_products ("REGISTRO_MS");
CREATE INDEX IF NOT EXISTS idx_pharmaceutical_products_nome ON pharmaceutical_products ("NOME");
CREATE INDEX IF NOT EXISTS idx_pharmaceutical_products_laboratorio ON pharmaceutical_products ("LABORATORIO");
CREATE INDEX IF NOT EXISTS idx_pharmaceutical_products_apresentacao ON pharmaceutical_products ("APRESENTACAO");

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pharmaceutical_products_updated_at
    BEFORE UPDATE ON pharmaceutical_products
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON pharmaceutical_products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON pharmaceutical_products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON pharmaceutical_products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON pharmaceutical_products FOR DELETE
TO authenticated
USING (true);