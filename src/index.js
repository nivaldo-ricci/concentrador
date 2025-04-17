import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { body, param, validationResult } from 'express-validator';
import { importAllData, checkTableEmpty } from './scripts/importGuiaData.js';
import { stringify } from 'csv-stringify';
import archiver from 'archiver';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

// Error handler middleware
const handleErrors = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Export products to CSV
app.get('/api/products/export', async (req, res) => {
  try {
    const pageSize = 1000; // Process 1000 records at a time
    let startRow = 0;
    let hasMoreData = true;
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `products_export_${currentDate}`;

    // Set response headers for ZIP file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Create CSV stringifier
    const stringifier = stringify({
      header: true,
      columns: [
        'id', 'ID_PRODUTO', 'EAN', 'REGISTRO_MS', 'NOME', 'APRESENTACAO',
        'LABORATORIO', 'PRINCIPIO_ATIVO', 'ID_TIPO_PRODUTO', 'DESCRICAO_TIPO_PRODUTO',
        'SUBTIPO_PRODUTO', 'ID_STATUS', 'DESCRICAO_STATUS', 'ID_TIPO_PRECO',
        'DESCRICAO_TIPO_PRECO', 'ID_HOSPITALAR', 'DESCRICAO_HOSPITALAR',
        'ID_TIPO_LISTA', 'DESCRICAO_TIPO_LISTA', 'DATA_VIGENCIA', 'NCM',
        'ID_TARJA', 'DESCRICAO_TARJA', 'CEST', 'PRECO_FABRICA_20', 'PRECO_MAXIMO_20',
        'CLASSETERAPEUTICA', 'CODIGO_ATC', 'created_at', 'updated_at',
        'PRECO_FABRICA_18', 'PRECO_MAXIMO_18', 'PRECO_FABRICA_18ALC', 'PRECO_MAXIMO_18ALC',
        'PRECO_FABRICA_175', 'PRECO_MAXIMO_175', 'PRECO_FABRICA_175ALC', 'PRECO_MAXIMO_175ALC',
        'PRECO_FABRICA_17', 'PRECO_MAXIMO_17', 'PRECO_FABRICA_17ALC', 'PRECO_MAXIMO_17ALC',
        'PRECO_FABRICA_12', 'PRECO_MAXIMO_12', 'PRECO_FABRICA_0', 'PRECO_MAXIMO_0',
        'PRECO_FABRICA_22', 'PRECO_MAXIMO_22', 'PRECO_FABRICA_21', 'PRECO_MAXIMO_21',
        'PRECO_FABRICA_19', 'PRECO_MAXIMO_19', 'PRECO_FABRICA_20ALC', 'PRECO_MAXIMO_20ALC',
        'PRECO_FABRICA_19ALC', 'PRECO_MAXIMO_19ALC', 'PRECO_FABRICA_205', 'PRECO_MAXIMO_205',
        'PRECO_FABRICA_195', 'PRECO_MAXIMO_195', 'PRECO_FABRICA_195ALC', 'PRECO_MAXIMO_195ALC',
        'PRECO_FABRICA_23', 'PRECO_MAXIMO_23', 'PRECO_FABRICA_225', 'PRECO_MAXIMO_225'
      ]
    });

    // Create a readable stream from stringifier
    const csvStream = new Readable();
    csvStream._read = () => {};
    stringifier.on('readable', () => {
      let data;
      while ((data = stringifier.read()) !== null) {
        csvStream.push(data);
      }
    });
    stringifier.on('error', (err) => {
      console.error('CSV Stringifier Error:', err);
      csvStream.destroy(err);
    });
    stringifier.on('finish', () => {
      csvStream.push(null);
    });

    // Add CSV stream to archive
    archive.append(csvStream, { name: `${fileName}.csv` });

    // Process data in chunks
    while (hasMoreData) {
      const { data: products, error, count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact' })
        .range(startRow, startRow + pageSize - 1);

      if (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch products');
      }

      if (!products || products.length === 0) {
        hasMoreData = false;
        break;
      }

      // Write chunk to CSV
      products.forEach(product => {
        stringifier.write(product);
      });

      startRow += pageSize;
      hasMoreData = products.length === pageSize;
    }

    // Finalize CSV and ZIP
    stringifier.end();
    archive.finalize();

  } catch (error) {
    console.error('Export Error:', error);
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Export failed',
        details: error.message
      });
    }
  }
});

// Import data endpoint
app.get('/api/import', async (req, res) => {
  try {
    const isEmpty = await checkTableEmpty();
    const summary = await importAllData();
    res.json({
      message: 'Import process completed',
      wasEmpty: isEmpty,
      summary
    });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ error: 'Import process failed', details: error.message });
  }
});

// Get product by EAN
app.get('/api/products/ean/:ean', 
  param('ean').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('EAN', req.params.ean)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Product not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get product by MS registration
app.get('/api/products/registro/:registroMS',
  param('registroMS').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('REGISTRO_MS', req.params.registroMS);

      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Products not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get products by name
app.get('/api/products/nome/:nome',
  param('nome').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .ilike('NOME', `%${req.params.nome}%`);

      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Products not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get products by presentation
app.get('/api/products/apresentacao/:apresentacao',
  param('apresentacao').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .ilike('APRESENTACAO', `%${req.params.apresentacao}%`);

      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Products not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get products by laboratory
app.get('/api/products/laboratorio/:laboratorio',
  param('laboratorio').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .ilike('LABORATORIO', `%${req.params.laboratorio}%`);

      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Products not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get products by status
app.get('/api/products/status/:id_status',
  param('id_status').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ID_STATUS', req.params.id_status);

      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Products not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/paginado/:pagina',
  param('pagina').notEmpty().trim().isInt({ min: 1 }),
  validate,
  async (req, res) => {
    const pagina = parseInt(req.params.pagina, 10);
    const itensPorPagina = 50;
    const offset = (pagina - 1) * itensPorPagina;

    try {
      // 1. Obter o total de produtos
      const { count, error: countError } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const totalPaginas = Math.ceil(count / itensPorPagina);

      // 2. Obter os dados paginados
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .range(offset, offset + itensPorPagina - 1);

      if (error) throw error;

      res.json({
        pagina,
        total_paginas: totalPaginas,
        data
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch paginated products' });
    }
  }
);

// Create new product
app.post('/api/products',
  [
    body('ID_PRODUTO').notEmpty().trim(),
    body('EAN').notEmpty().trim(),
    body('REGISTRO_MS').notEmpty().trim(),
    body('NOME').notEmpty().trim(),
    body('APRESENTACAO').notEmpty().trim(),
    body('LABORATORIO').notEmpty().trim(),
    body('PRINCIPIO_ATIVO').notEmpty().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert([req.body])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({ error: 'Product with this EAN already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create product' });
      }
    }
});

// Update product
app.put('/api/products/:id',
  [
    param('id').notEmpty().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Product not found' });

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
app.delete('/api/products/:id',
  param('id').notEmpty().trim(),
  validate,
  async (req, res) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', req.params.id);

      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.use(handleErrors);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
