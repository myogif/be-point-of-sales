import express from 'express';
import {
  createSale,
  createCredit,
  getAllSales,
  getSaleById
} from '../controllers/sales.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', authenticateToken, createSale);
router.post('/credit', authenticateToken, createCredit);
router.get('/', authenticateToken, getAllSales);
router.get('/:id', authenticateToken, getSaleById);

export default router;