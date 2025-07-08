import express from 'express';
import { uploadImage, uploadMiddleware } from '../controllers/upload.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/image', authenticateToken, uploadMiddleware, uploadImage);

export default router;