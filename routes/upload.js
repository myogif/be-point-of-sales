import express from 'express';
import { uploadImage, uploadMiddleware } from '../controllers/upload.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Handle CORS preflight requests
router.options('/image', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

router.post('/image', authenticateToken, uploadMiddleware, uploadImage);

export default router;