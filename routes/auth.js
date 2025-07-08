import express from 'express';
import { login, register } from '../controllers/auth.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
// router.post('/register', authenticateToken, requireAdmin, register);
router.post('/register', register);


export default router;