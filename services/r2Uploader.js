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
    const mimeTypeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };

    const detectedExtension = mimeTypeMap[file.mimetype] || file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${detectedExtension}`;
    
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const result = await s3.upload(uploadParams).promise();
    
    // Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload image');
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
