import mongoose from 'mongoose';
import Property from '../models/v1/realtor/property.js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
const updatePropertiesStatus = async () => {
  dotenv.config();
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Update all properties to have a status of 'pending'
    const result = await Property.updateMany(
      { status: { $exists: false } }, // Only update documents where the status field does not exist
      { $set: { status: 'pending' } }
    );

    logger.info(`Successfully updated ${result.nModified} properties.`);
  } catch (err) {
    // console.error('Error updating properties:', err);
    logger.error('Error updating properties:', err);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
  }
};

updatePropertiesStatus();
