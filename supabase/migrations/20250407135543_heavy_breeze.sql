/*
  # Rename pharmaceutical_products table to produtos

  1. Changes
    - Rename table from pharmaceutical_products to produtos
    - Update indexes to use new table name
    - Update RLS policies for new table name
*/

-- Rename the table
ALTER TABLE pharmaceutical_products RENAME TO produtos;

-- Update indexes
ALTER INDEX pharmaceutical_products_pkey RENAME TO produtos_pkey;
ALTER INDEX "pharmaceutical_products_EAN_key" RENAME TO "produtos_EAN_key";
ALTER INDEX idx_pharmaceutical_products_ean RENAME TO idx_produtos_ean;
ALTER INDEX idx_pharmaceutical_products_registro_ms RENAME TO idx_produtos_registro_ms;
ALTER INDEX idx_pharmaceutical_products_nome RENAME TO idx_produtos_nome;
ALTER INDEX idx_pharmaceutical_products_laboratorio RENAME TO idx_produtos_laboratorio;
ALTER INDEX idx_pharmaceutical_products_apresentacao RENAME TO idx_produtos_apresentacao;

-- Drop old policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON produtos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON produtos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON produtos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON produtos;

-- Create new policies with updated table name
CREATE POLICY "Enable read access for authenticated users"
ON produtos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON produtos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON produtos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON produtos FOR DELETE
TO authenticated
USING (true);