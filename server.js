import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import salesRoutes from './routes/sales.js';
import creditRoutes from './routes/credits.js';
import customerRoutes from './routes/customers.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Test Supabase connection on startup
import { supabase } from './services/supabaseClient.js';

// Test connection
(async () => {
  try {
    const { data, error } = await supabase.from('categories').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
})();

// Middleware
// app.use(cors({
//   origin: ['http://localhost:5173', 'http://localhost:3000'],
//   credentials: true
// }));

app.use(cors({
  origin: '*'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Vegetable Store POS API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large' });
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
