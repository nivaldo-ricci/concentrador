import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { body, param, validationResult } from 'express-validator';
import { importAllData, checkTableEmpty } from './scripts/importGuiaData.js';

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