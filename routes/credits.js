import express from 'express';
import {
  getAllCredits,
  getTotalOutstanding,
  getCreditsByCustomer,
  makePayment,
  getCreditById,
  createCredit
} from '../controllers/credits.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getAllCredits);
router.post('/', authenticateToken, createCredit);
router.get('/total-outstanding', authenticateToken, getTotalOutstanding);
router.get('/customer/:customer_name', authenticateToken, getCreditsByCustomer);
router.post('/pay/:id', authenticateToken, makePayment);
router.get('/:id', authenticateToken, getCreditById);

export default router;
