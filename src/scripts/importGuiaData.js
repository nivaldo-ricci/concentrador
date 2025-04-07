import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const GUIA_API_URL = process.env.GUIA_URL;
const GUIA_CNPJ_SH = process.env.GUIA_CNPJ_SH;
const GUIA_CNPJ_CPF = process.env.GUIA_CNPJ_CPF;
const GUIA_EMAIL = process.env.GUIA_EMAIL;
const GUIA_SENHA = process.env.GUIA_SENHA;

// Function to convert DD/MM/YYYY to YYYY-MM-DD
function convertDateFormat(dateStr) {
  if (!dateStr) return null;
  try {
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return null;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return new Date(isoDate).toISOString();
  } catch (error) {
    console.error(`[Date Conversion] Failed to convert date: ${dateStr}`, error);
    return null;
  }
}

async function fetchGuiaData(page, retryCount = 0) {
  console.log(`[API Request] Preparing to fetch page ${page} (Attempt ${retryCount + 1})`);
  
  const formData = new URLSearchParams();
  formData.append('cnpj_sh', GUIA_CNPJ_SH);
  formData.append('cnpj_cpf', GUIA_CNPJ_CPF);
  formData.append('email', GUIA_EMAIL);
  formData.append('senha', GUIA_SENHA);
  formData.append('pagina', page);

  try {
    console.log(`[API] Sending POST request to ${GUIA_API_URL} for page ${page}`);
    const response = await axios.post(GUIA_API_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`[API Response] Status: ${response.status}`);
    
    if (response.data) {
      console.log('[API Response] Data structure:', {
        page: response.data.pagina,
        totalPages: response.data.total_paginas,
        totalItems: response.data.total_itens,
        itemsInPage: response.data.total_data,
        lastUpdate: response.data.data_atualizacao,
        productsCount: response.data.data?.length || 0
      });
      
      // Process dates in the response data
      if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data = response.data.data.map(product => {
          // Convert all date fields
          const processedProduct = {
            ...product,
            DATA_VIGENCIA: convertDateFormat(product.DATA_VIGENCIA),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Convert numeric fields to ensure proper format
          const numericFields = [
            'PRECO_FABRICA_20', 'PRECO_MAXIMO_20', 'PRECO_FABRICA_18', 'PRECO_MAXIMO_18',
            'PRECO_FABRICA_18ALC', 'PRECO_MAXIMO_18ALC', 'PRECO_FABRICA_175', 'PRECO_MAXIMO_175',
            'PRECO_FABRICA_175ALC', 'PRECO_MAXIMO_175ALC', 'PRECO_FABRICA_17', 'PRECO_MAXIMO_17',
            'PRECO_FABRICA_17ALC', 'PRECO_MAXIMO_17ALC', 'PRECO_FABRICA_12', 'PRECO_MAXIMO_12',
            'PRECO_FABRICA_0', 'PRECO_MAXIMO_0', 'PRECO_FABRICA_22', 'PRECO_MAXIMO_22',
            'PRECO_FABRICA_21', 'PRECO_MAXIMO_21', 'PRECO_FABRICA_19', 'PRECO_MAXIMO_19',
            'PRECO_FABRICA_20ALC', 'PRECO_MAXIMO_20ALC', 'PRECO_FABRICA_19ALC', 'PRECO_MAXIMO_19ALC',
            'PRECO_FABRICA_205', 'PRECO_MAXIMO_205', 'PRECO_FABRICA_195', 'PRECO_MAXIMO_195',
            'PRECO_FABRICA_195ALC', 'PRECO_MAXIMO_195ALC', 'PRECO_FABRICA_23', 'PRECO_MAXIMO_23',
            'PRECO_FABRICA_225', 'PRECO_MAXIMO_225'
          ];

          numericFields.forEach(field => {
            if (processedProduct[field]) {
              processedProduct[field] = parseFloat(processedProduct[field].replace(',', '.')) || 0;
            } else {
              processedProduct[field] = 0;
            }
          });

          return processedProduct;
        });
      }
      
      return response.data;
    }
    
    throw new Error('Empty response data');
  } catch (error) {
    console.error(`[API Error] Failed to fetch page ${page}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    if (retryCount < 3) {
      console.log(`[API Retry] Attempting retry ${retryCount + 1} of 3 after 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchGuiaData(page, retryCount + 1);
    }

    console.error(`[API Error] Max retries reached for page ${page}`);
    return null;
  }
}

async function insertProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    console.error('[DB Error] Invalid products data:', typeof products);
    return;
  }

  console.log(`[DB] Processing batch of ${products.length} products`);

  try {
    // Filter out products with invalid dates
    const validProducts = products.filter(product => {
      const isValid = product.DATA_VIGENCIA !== null;
      if (!isValid) {
        console.warn(`[DB Warning] Invalid date for product: ${product.EAN}`);
      }
      return isValid;
    });
    
    if (validProducts.length !== products.length) {
      console.warn(`[DB Warning] Filtered out ${products.length - validProducts.length} products with invalid dates`);
    }

    const { data, error } = await supabase
      .from('produtos')
      .upsert(validProducts, {
        onConflict: 'EAN',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[DB Error] Upsert error:', error);
      throw error;
    }

    console.log(`[DB Success] Processed ${validProducts.length} products`);
    return validProducts.length;
  } catch (error) {
    console.error('[DB Error] Failed to insert products:', {
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return null;
  }
}

async function checkTableEmpty() {
  console.log('[DB] Checking if produtos table is empty');
  try {
    const { count, error } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    console.log(`[DB] Current table count: ${count}`);
    return count === 0;
  } catch (error) {
    console.error('[DB Error] Failed to check table:', error);
    return false;
  }
}

async function importAllData() {
  console.log('\n[Import] Starting Guia da Farmácia data import');
  console.log('[Import] Time:', new Date().toISOString());

  let currentPage = 1;
  let totalPages = null;
  let totalProducts = 0;
  let importSummary = {
    startTime: new Date().toISOString(),
    endTime: null,
    pagesProcessed: 0,
    totalPages: 0,
    productsImported: 0,
    status: 'in_progress',
    errors: []
  };

  try {
    while (true) {
      console.log(`\n[Import] Processing page ${currentPage}`);
      
      const response = await fetchGuiaData(currentPage);
      
      if (!response) {
        console.log('[Import] No response received, checking if temporary error...');
        if (totalProducts > 0) {
          console.log('[Import] Previous pages were successful, waiting 5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        } else {
          console.log('[Import] No successful imports yet, ending process');
          importSummary.status = 'failed';
          importSummary.errors.push('Failed to fetch initial data');
          break;
        }
      }

      // Set total pages on first successful response
      if (totalPages === null) {
        totalPages = response.total_paginas;
        importSummary.totalPages = totalPages;
        console.log(`[Import] Total pages to process: ${totalPages}`);
      }

      const products = response.data;
      if (!Array.isArray(products)) {
        console.log('[Import] Invalid products array in response');
        console.log('[Import] Response structure:', response);
        importSummary.status = 'failed';
        importSummary.errors.push('Invalid products data structure');
        break;
      }

      if (products.length === 0) {
        console.log('[Import] Received empty products array');
        break;
      }

      console.log(`[Import] Processing ${products.length} products from page ${currentPage}`);
      const processedCount = await insertProducts(products);
      
      if (processedCount !== null) {
        totalProducts += processedCount;
        importSummary.productsImported = totalProducts;
        importSummary.pagesProcessed = currentPage;
        
        console.log(`[Import] Progress: ${totalProducts} total products imported`);
        console.log(`[Import] Page ${currentPage} of ${totalPages} completed`);
        
        if (currentPage >= totalPages) {
          console.log('[Import] Reached last page, ending import');
          importSummary.status = 'completed';
          break;
        }
        
        currentPage++;
        
        // Rate limiting
        console.log('[Import] Waiting 1 second before next request...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('[Import] Failed to process page, retrying...');
        importSummary.errors.push(`Failed to process page ${currentPage}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('[Import] Unexpected error during import:', error);
    importSummary.status = 'failed';
    importSummary.errors.push(`Unexpected error: ${error.message}`);
  }

  importSummary.endTime = new Date().toISOString();

  console.log('\n[Import] Import process completed');
  console.log(`[Import] Final Statistics:`, importSummary);

  return importSummary;
}

// Schedule task to run at 3 AM every 7 days
cron.schedule('0 3 */7 * *', async () => {
  console.log('[Scheduler] Starting scheduled import task');
  try {
    await importAllData();
    console.log('[Scheduler] Scheduled import completed successfully');
  } catch (error) {
    console.error('[Scheduler] Scheduled import failed:', error);
  }
});

export { importAllData, checkTableEmpty };