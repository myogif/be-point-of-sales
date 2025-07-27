import multer from 'multer';
import { uploadToR2 } from '../services/r2Uploader.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

export const uploadMiddleware = upload.single('image');

export const uploadImage = async (req, res) => {
  try {
    console.log('📤 Upload request received:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      mimeType: req.file?.mimetype,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    if (!req.file) {
      console.error('❌ No file provided in upload request');
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    console.log('☁️ Uploading to R2...');
    const imageUrl = await uploadToR2(req.file, 'products');
    
    console.log('✅ Upload successful:', { imageUrl });
    res.json({
      message: 'Image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('💥 Upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });
    
    // Return detailed error information
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message,
      code: error.code || 'UPLOAD_ERROR',
      errorName: error.name,
      // Include additional context for debugging
      debug: {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileName: req.file?.originalname
      }
    });
  }
};