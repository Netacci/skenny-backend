import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadSingleFile = upload.single('feature_image');
const uploadMultipleFiles = upload.array('property_images[]', 10);

const uploadToCloudinary = (buffer, folder = 'temp_properties') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: uuidv4() },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
};

const moveToPermamentFolder = async (publicId) => {
  try {
    if (!publicId) throw new Error('Missing required public ID');

    // Extract the filename from the public ID
    const filename = publicId.split('/').pop();

    // Construct the new public ID in the permanent folder
    const newPublicId = `permanent_properties/${filename}`;

    const result = await cloudinary.uploader.rename(publicId, newPublicId, {
      invalidate: true,
    });

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    logger.error('Error moving image to permanent folder:', error.message);
    throw error;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};
// Cleanup job (run periodically, e.g., daily)
async function cleanupTemporaryImages() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { resources } = await cloudinary.search
    .expression(
      `folder:temp_properties AND uploaded_at<${oneDayAgo.toISOString()}`
    )
    .execute();

  for (const resource of resources) {
    await deleteImage(resource.public_id);
  }
}
export {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadToCloudinary,
  deleteFromCloudinary,
  moveToPermamentFolder,
  cleanupTemporaryImages,
};
