import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from './logger.js';

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
/**
 * Sets the destination folder for storing uploaded files.
 *
 * @param {Object} req - The request object.
 * @param {Object} file - The uploaded file object.
 * @param {Function} cb - The callback function.
 * @return {void}
 */
// Configure Multer
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'src/uploads/'); // Temporary folder to store files
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Append extension
//   },
// });
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// const uploadFiles = upload.fields([
//   { name: 'feature_image', maxCount: 1 },
//   { name: 'property_images', maxCount: 10 },
// ]);
// const uploadFiles = upload.single('feature_image');
upload.array(['feature_image', 'property_images']);
/**
 * Uploads a file to Cloudinary and deletes it from the temporary folder after uploading.
 *
 * @param {Object} file - The file to upload.
 * @param {string} file.path - The path to the file.
 * @return {Promise<string>} The secure URL of the uploaded file.
 * @throws {Error} If the upload to Cloudinary fails.
 */
// const uploadToCloudinary = async (file) => {
//   try {
//     const result = await cloudinary.uploader.upload(file.path);
//     // Delete the file from the temporary folder after uploading
//     fs.unlinkSync(file.path);
//     return result.secure_url;
//   } catch (error) {
//     // If there is an error, delete the file as well
//     fs.unlinkSync(file.path);
//     throw new Error('Failed to upload to Cloudinary');
//   }
// };
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary based on the provided image URL.
 *
 * @param {string} imageUrl - The URL of the image to be deleted.
 * @return {Promise<void>} - A promise that resolves when the image is successfully deleted.
 * @throws {Error} - If there is an error deleting the image from Cloudinary.
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract the public ID from the image URL
    const publicId = imageUrl.split('/').pop().split('.')[0];
    // Delete the image from Cloudinary
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // console.error('Error deleting image from Cloudinary:', error);
    logger.error('Error deleting image from Cloudinary:', error);
  }
};

export { uploadFiles, uploadToCloudinary, deleteFromCloudinary };
