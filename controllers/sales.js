import { supabase } from '../services/supabaseClient.js';

export const createSale = async (req, res) => {
  try {
    const { items, customer_id, payment_method = 'cash' } = req.body;
    const cashier_id = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale items are required' });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.total, 0);

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{
        cashier_id,
        customer_id,
        total,
        payment_method,
        status: 'completed'
      }])
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale record:', saleError);
      throw saleError;
    }

    // Create sale details
    const saleDetails = items.map(item => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_type: item.selectedUnit,
      unit_price: item.price,
      total: item.total
    }));

    const { error: detailsError } = await supabase
      .from('sale_details')
      .insert(saleDetails);

    if (detailsError) throw detailsError;

    // Update product stock
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id_in: item.id,
        quantity_in: item.quantity,
      });

      if (stockError) {
        console.error('Error updating stock for product:', item.id, stockError);
        // Continue to next item, but log the error
      }
    }

    res.status(201).json({
      message: 'Sale completed successfully',
      sale: {
        ...sale,
        items: saleDetails
      }
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
};

export const createCredit = async (req, res) => {
  try {
    const { items, customer_name, due_date } = req.body;
    const cashier_id = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale items are required' });
    }

    if (!customer_name) {
      return res.status(400).json({ error: 'Customer name is required for credit' });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.total, 0);

    // Create sale with credit payment method
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{
        cashier_id,
        total,
        payment_method: 'credit',
        status: 'pending'
      }])
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale details
    const saleDetails = items.map(item => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_type: item.selectedUnit,
      unit_price: item.price,
      total: item.total
    }));

    const { error: detailsError } = await supabase
      .from('sale_details')
      .insert(saleDetails);

    if (detailsError) throw detailsError;

    // Create credit record
    const { data: credit, error: creditError } = await supabase
      .from('credits')
      .insert([{
        sale_id: sale.id,
        customer_name,
        amount_owed: total,
        due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (creditError) throw creditError;

    // Update product stock
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id_in: item.id,
        quantity_in: item.quantity,
      });

      if (stockError) {
        console.error('Error updating stock for product:', item.id, stockError);
      }
    }

    res.status(201).json({
      message: 'Credit sale created successfully',
      sale: {
        ...sale,
        items: saleDetails,
        credit
      }
    });
  } catch (error) {
    console.error('Error creating credit:', error);
    res.status(500).json({ error: 'Failed to create credit' });
  }
};

export const getAllSales = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, payment_method, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sales')
      .select(`
        *,
        users!sales_cashier_id_fkey (username),
        customers (name),
        sale_details (
          *,
          products (name, barcode)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data: sales, error } = await query;

    if (error) throw error;

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        users!sales_cashier_id_fkey (username),
        customers (name),
        sale_details (
          *,
          products (name, barcode, image_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
};
