import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

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
// Function to delete temp_properties images from Cloudinary
const deleteTempImages = async () => {
  try {
    // Search for images starting with 'temp_properties/'
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'temp_properties/', // This filters for images starting with 'temp_properties/'
      max_results: 500, // You can adjust this if you expect a large number of images
    });

    // Extract public_ids of the images found
    const imagesToDelete = result.resources.map((image) => image.public_id);

    if (imagesToDelete.length > 0) {
      // Delete images from Cloudinary
      const deleteResponse = await cloudinary.api.delete_resources(
        imagesToDelete
      );
      logger.info('Deleted temp images:', deleteResponse);
    } else {
      logger.info('No temp images found to delete.');
    }
  } catch (error) {
    logger.error('Error deleting temp images:', error);
  }
};

// Schedule the job to run every 24 hours
cron.schedule('0 0 * * *', () => {
  logger.info('Running daily temp image cleanup job...');
  deleteTempImages();
});
export {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadToCloudinary,
  deleteFromCloudinary,
  moveToPermamentFolder,
};
