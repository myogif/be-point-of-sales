import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

export const uploadToR2 = async (file, folder = 'products') => {
  try {
    console.log('☁️ R2 Upload starting:', {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      folder,
      bucketName: process.env.R2_BUCKET_NAME,
      hasEndpoint: !!process.env.R2_ENDPOINT,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasPublicUrl: !!process.env.R2_PUBLIC_URL
    });

    // Validate environment variables
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error('R2_BUCKET_NAME environment variable is not set');
    }
    if (!process.env.R2_ENDPOINT) {
      throw new Error('R2_ENDPOINT environment variable is not set');
    }
    if (!process.env.R2_ACCESS_KEY_ID) {
      throw new Error('R2_ACCESS_KEY_ID environment variable is not set');
    }
    if (!process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2_SECRET_ACCESS_KEY environment variable is not set');
    }
    if (!process.env.R2_PUBLIC_URL) {
      throw new Error('R2_PUBLIC_URL environment variable is not set');
    }

    const mimeTypeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };

    const detectedExtension = mimeTypeMap[file.mimetype] || file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${detectedExtension}`;
    
    console.log('📁 Generated file path:', fileName);
    
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    console.log('🚀 Starting S3 upload...');
    const result = await s3.upload(uploadParams).promise();
    
    console.log('✅ S3 upload result:', {
      location: result.Location,
      bucket: result.Bucket,
      key: result.Key,
      etag: result.ETag
    });
    
    // Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log('🌐 Generated public URL:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('💥 R2 Upload error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      statusCode: error.statusCode,
      stack: error.stack,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype
    });
    
    // Provide more specific error messages
    if (error.code === 'NoSuchBucket') {
      throw new Error(`R2 bucket '${process.env.R2_BUCKET_NAME}' does not exist`);
    } else if (error.code === 'InvalidAccessKeyId') {
      throw new Error('Invalid R2 access key ID');
    } else if (error.code === 'SignatureDoesNotMatch') {
      throw new Error('Invalid R2 secret access key');
    } else if (error.code === 'NetworkingError') {
      throw new Error('Network error connecting to R2 storage');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      throw new Error('Cannot resolve R2 endpoint hostname');
    } else {
      throw new Error(`R2 upload failed: ${error.message}`);
    }
  }
};

export const deleteFromR2 = async (imageUrl) => {
  try {
    const fileName = imageUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');
    
    const deleteParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
    };

    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    return false;
  }
};
