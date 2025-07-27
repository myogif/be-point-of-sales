import { supabase } from '../services/supabaseClient.js';

export const getAllProducts = async (req, res) => {
  try {
    const { category_id, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `, { count: 'exact' });

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .eq('barcode', barcode)
      .single();

    if (error) throw error;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    const productData = req.body;
    
    // Validate required fields
    if (!productData.name || !productData.name.trim()) {
      console.log('Validation failed: Product name is required');
      return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (!productData.category_id) {
      console.log('Validation failed: Category is required');
      return res.status(400).json({ error: 'Category is required' });
    }
    
    if (!productData.unit_type) {
      console.log('Validation failed: Unit type is required');
      return res.status(400).json({ error: 'Unit type is required' });
    }
    
    // Validate that the price for the selected unit type is provided
    const priceField = `price_${productData.unit_type}`;
    if (!productData[priceField] || productData[priceField] <= 0) {
      console.log(`Validation failed: Valid price for ${productData.unit_type} is required`);
      return res.status(400).json({ error: `Valid price for ${productData.unit_type} is required` });
    }

    // Validate numeric field limits (precision 10, scale 2 = max 99,999,999.99)
    const maxValue = 99999999.99;
    const priceFields = ['price_kg', 'price_ons', 'price_pcs', 'price_liter'];
    
    for (const field of priceFields) {
      if (productData[field] && productData[field] > maxValue) {
        console.log(`Validation failed: ${field} exceeds maximum value`);
        return res.status(400).json({
          error: `${field.replace('price_', '').toUpperCase()} price cannot exceed ${maxValue.toLocaleString()}`
        });
      }
    }

    if (productData.stock && productData.stock > maxValue) {
      console.log('Validation failed: Stock exceeds maximum value');
      return res.status(400).json({ error: `Stock cannot exceed ${maxValue.toLocaleString()}` });
    }
    
    console.log('Inserting product into Supabase...');
    const { data: product, error } = await supabase
      .from('products')
      .insert([productData])
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Product created successfully:', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // Handle duplicate barcode error
    if (error.code === '23505' && error.details && error.details.includes('barcode')) {
      return res.status(409).json({
        error: 'Product with this barcode already exists',
        code: 'DUPLICATE_BARCODE'
      });
    }
    
    // Handle foreign key constraint error (invalid category_id)
    if (error.code === '23503' && error.details && error.details.includes('category_id')) {
      return res.status(400).json({
        error: 'Invalid category selected',
        code: 'INVALID_CATEGORY'
      });
    }

    // Handle numeric field overflow error
    if (error.code === '22003') {
      return res.status(400).json({
        error: 'One or more numeric values exceed the maximum allowed limit (99,999,999.99)',
        code: 'NUMERIC_OVERFLOW'
      });
    }
    
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    // Validate required fields if they are being updated
    if (productData.name !== undefined && (!productData.name || !productData.name.trim())) {
      return res.status(400).json({ error: 'Product name cannot be empty' });
    }
    
    // If unit_type is being updated, validate the corresponding price
    if (productData.unit_type !== undefined) {
      const priceField = `price_${productData.unit_type}`;
      if (!productData[priceField] || productData[priceField] <= 0) {
        return res.status(400).json({ error: `Valid price for ${productData.unit_type} is required` });
      }
    }

    // Validate numeric field limits (precision 10, scale 2 = max 99,999,999.99)
    const maxValue = 99999999.99;
    const priceFields = ['price_kg', 'price_ons', 'price_pcs', 'price_liter'];
    
    for (const field of priceFields) {
      if (productData[field] !== undefined && productData[field] > maxValue) {
        return res.status(400).json({
          error: `${field.replace('price_', '').toUpperCase()} price cannot exceed ${maxValue.toLocaleString()}`
        });
      }
    }

    if (productData.stock !== undefined && productData.stock > maxValue) {
      return res.status(400).json({ error: `Stock cannot exceed ${maxValue.toLocaleString()}` });
    }
    
    const { data: product, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) throw error;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle duplicate barcode error
    if (error.code === '23505' && error.details && error.details.includes('barcode')) {
      return res.status(409).json({
        error: 'Product with this barcode already exists',
        code: 'DUPLICATE_BARCODE'
      });
    }
    
    // Handle foreign key constraint error (invalid category_id)
    if (error.code === '23503' && error.details && error.details.includes('category_id')) {
      return res.status(400).json({
        error: 'Invalid category selected',
        code: 'INVALID_CATEGORY'
      });
    }

    // Handle numeric field overflow error
    if (error.code === '22003') {
      return res.status(400).json({
        error: 'One or more numeric values exceed the maximum allowed limit (99,999,999.99)',
        code: 'NUMERIC_OVERFLOW'
      });
    }
    
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (checkError) throw checkError;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Handle foreign key constraint error (product is referenced in sales)
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'Cannot delete product as it is referenced in sales records',
        code: 'PRODUCT_IN_USE'
      });
    }
    
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
