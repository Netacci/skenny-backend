import mongoose from 'mongoose';
import Realtor from '../models/v1/realtor/auth.js';
import dotenv from 'dotenv';
const updateBannedStatus = async () => {
  dotenv.config();
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI);

    // Update all realtors to have a isBanned status of 'false'
    const result = await Realtor.updateMany(
      { isBanned: { $exists: false } }, // Only update documents where the status field does not exist
      { $set: { isBanned: false } }
    );

    console.log(`Successfully updated ${result.nModified} properties.`);
  } catch (err) {
    console.error('Error updating properties:', err);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
  }
};

updateBannedStatus();
