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

export const uploadMiddleware = (req, res, next) => {
  console.log('📤 Upload middleware called:', {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    hasFile: !!req.file,
    bodyKeys: Object.keys(req.body || {}),
    userAgent: req.headers['user-agent']?.substring(0, 100)
  });

  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('💥 Multer error:', {
        message: err.message,
        code: err.code,
        field: err.field,
        storageErrors: err.storageErrors
      });
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          details: 'Image must be smaller than 5MB',
          code: 'FILE_TOO_LARGE'
        });
      } else if (err.message === 'Only image files are allowed') {
        return res.status(400).json({
          error: 'Invalid file type',
          details: 'Only image files are allowed',
          code: 'INVALID_FILE_TYPE'
        });
      } else {
        return res.status(400).json({
          error: 'Upload error',
          details: err.message,
          code: 'UPLOAD_ERROR'
        });
      }
    }
    
    console.log('✅ Multer processed successfully:', {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype
    });
    
    next();
  });
};

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