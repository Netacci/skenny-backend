import { getProperty, populateUserDetails } from '../../daos/property-dao.js';
import RealtorProperties from '../../models/realtor/realtor.js';
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/upload.js';

/**
 * Uploads property images to Cloudinary and returns the feature image URL and property image URLs.
 *
 * @param {Object} req - The request object containing the uploaded files.
 * @param {Object} res - The response object to send the result.
 * @return {Promise<Object>} An object containing the feature image URL and property image URLs.
 * @throws {Error} If there is an error uploading the images to Cloudinary.
 */
const uploadPropertyImages = async (req, res) => {
  try {
    let featureImageUrl;
    if (req.files.feature_image) {
      featureImageUrl = await uploadToCloudinary(req.files.feature_image[0]);
    }
    const propertyImageUrls = [];
    // for(let i = 0; i < req.files.property_images.length; i++){
    //   const propertyImageUrl = await uploadToCloudinary(req.files.property_images[i]);
    //   propertyImageUrls.push(propertyImageUrl);
    // }
    // return {featureImageUrl, propertyImageUrls}
    if (req.files.property_images) {
      for (const file of req.files.property_images) {
        const propertyImageUrl = await uploadToCloudinary(file);
        propertyImageUrls.push(propertyImageUrl);
      }
    }
    res.status(200).json({
      feature_image: featureImageUrl,
      property_images: propertyImageUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Adds a new property to the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.body - The body of the request containing property details.
 * @param {string} req.body.property_name - The name of the property.
 * @param {string} req.body.property_description - The description of the property.
 * @param {string} req.body.address - The address of the property.
 * @param {string} req.body.country - The country where the property is located.
 * @param {string} req.body.state - The state where the property is located.
 * @param {string} req.body.city - The city where the property is located.
 * @param {Object} req.body.property_details - Additional details of the property.
 * @param {Object} req.body.property_images - Multiple images of the property.
 * @param {Object} req.body.feature_image- Main image of the property.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the property is added or an error occurs.
 * // Example usage in an Express route
 * @example
 * app.post('/properties', addProperty);
 */
const addProperty = async (req, res) => {
  const {
    property_name,
    property_description,
    address,
    country,
    state,
    city,
    property_details,
    feature_image,
    property_images,
  } = req.body;
  try {
    if (
      !property_name ||
      !property_description ||
      !address ||
      !country ||
      !state ||
      !city ||
      !property_details ||
      !feature_image
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const prop = await RealtorProperties.create({
      property_name,
      property_description,
      address,
      country,
      state,
      city,
      property_details,
      feature_image,
      property_images,
      user: req.user._id,
    });
    const property = await populateUserDetails(prop);
    res.status(201).json({ message: 'Property added successfully', property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Retrieves all properties from the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @returns {Promise<void>} - A promise that resolves when all properties are fetched or an error occurs.
 *
 * @example
 * // Example usage in an Express route
 * app.get('/properties', getAllProperties);
 */
const getAllProperties = async (req, res) => {
  try {
    const properties = await RealtorProperties.find({
      user: req.user._id,
    });
    res
      .status(200)
      .json({ properties, message: 'Properties fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Retrieves a single property by its ID.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.params - The parameters object from the request.
 * @param {string} req.params.id - The ID of the property to retrieve.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the property is fetched or an error occurs.
 *
 * @example
 * // Example usage in an Express route
 * app.get('/properties/:id', getSingleProperty);
 */
const getSingleProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const prop = await RealtorProperties.findOne({
      _id: id,
      user: req.user._id,
    });
    const result = await getProperty(prop);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Property not found' });
    }

    const property = await populateUserDetails(result.data);
    res
      .status(200)
      .json({ property, message: 'Property fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Deletes a property by its ID from the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.params - The parameters object from the request.
 * @param {string} req.params.id - The ID of the property to delete.
 * @param {Object} res - The response object.
 * @param {Object} req.user - The user object from the request, representing the authenticated user.
 * @throws {Error} If the property is not found or if there is an error deleting the property from the database.
 * @returns {Promise<void>} - A promise that resolves when the property is deleted successfully.
 */
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  try {
    // delete only user properties

    const property = await RealtorProperties.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });
    const result = await getProperty(property);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Property not found' });
    }

    // Delete images from Cloudinary
    if (property.feature_image) {
      await deleteFromCloudinary(property.feature_image);
    }
    if (property.property_images && property.property_images.length > 0) {
      for (const imageUrl of property.property_images) {
        await deleteFromCloudinary(imageUrl);
      }
    }
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Updates a property in the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Promise<void>} The updated property and a success message, or an error message if the property is not found or an error occurs.
 */
const editProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await RealtorProperties.findOneAndUpdate(
      { _id: id, user: req.user._id },
      req.body,
      { new: true }
    );
    const result = await getProperty(property);
    // Check if the property was found
    if (!result.success) {
      return res.status(result.code).json({ message: 'Property not found' });
    }

    res
      .status(200)
      .json({ property, message: 'Property updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export {
  getAllProperties,
  getSingleProperty,
  addProperty,
  editProperty,
  deleteProperty,
  uploadPropertyImages,
};
