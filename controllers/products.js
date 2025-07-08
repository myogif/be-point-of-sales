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
    const productData = req.body;
    
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

    if (error) throw error;

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Handle duplicate barcode error
    if (error.code === '23505' && error.details && error.details.includes('barcode')) {
      return res.status(409).json({ 
        error: 'Product with this barcode already exists',
        code: 'DUPLICATE_BARCODE'
      });
    }
    
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
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
    
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
