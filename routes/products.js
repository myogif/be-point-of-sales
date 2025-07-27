import express from 'express';
import {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/products.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

export default router;