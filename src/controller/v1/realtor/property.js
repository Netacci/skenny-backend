import {
  getProperty,
  populateUserDetails,
} from '../../../daos/property-dao.js';
import RealtorProperties from '../../../models/v1/realtor/property.js';
import logger from '../../../utils/logger.js';
import {
  deleteFromCloudinary,
  uploadToCloudinary,
  moveToPermamentFolder,
} from '../../../utils/upload.js';
import { body, validationResult } from 'express-validator';

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
    if (req.file) {
      featureImageUrl = await uploadToCloudinary(req.file.buffer);
    }
    const propertyImageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const propertyImageUrl = await uploadToCloudinary(file.buffer);
        propertyImageUrls.push(propertyImageUrl);
      }
    }

    res.status(200).json({
      feature_image: featureImageUrl,
      property_images: propertyImageUrls,
    });
  } catch (err) {
    logger.error(`Error uploading property images: ${err}`);
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
  if (req.body.feature_image) {
    req.body.feature_image = decodeURIComponent(req.body.feature_image);
  }

  // Validation and Sanitization
  await body('property_name').notEmpty().trim().escape().run(req);
  await body('property_description').notEmpty().trim().escape().run(req);
  await body('address').optional().trim().escape().run(req);
  await body('country').notEmpty().trim().escape().run(req);
  await body('state').notEmpty().trim().escape().run(req);
  await body('city').optional().trim().escape().run(req);
  // await body('feature_image')
  //   .custom((value) => {
  //     // Check if the value is an object and not null
  //     if (typeof value === 'object' && value !== null) {
  //       const { url, public_id } = value;

  //       // Ensure both url and public_id exist
  //       if (!url || !public_id) {
  //         throw new Error('Feature image must contain both URL and public ID');
  //       }

  //       // Validate URL
  //       const decodedUrl = decodeURIComponent(url || '');
  //       if (!decodedUrl.startsWith('https://res.cloudinary.com/')) {
  //         throw new Error('Invalid feature image URL');
  //       }

  //       return true;
  //     }

  //     throw new Error('Feature image must be an object');
  //   })
  //   .run(req);

  await body('property_images').optional().isArray().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
    status = 'pending',
  } = req.body;

  try {
    if (
      !property_name ||
      !property_description ||
      !country ||
      !state ||
      !feature_image
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (req.user.isBanned) {
      return res.status(403).json({ message: 'You are banned', status: 403 });
    }
    const featImage = JSON.parse(feature_image);
    // Move images to permanent folder
    const permanentFeatureImage = featImage?.public_id
      ? await moveToPermamentFolder(featImage?.public_id)
      : null;
    // const permanentPropertyImages = await Promise.all(
    //   property_images.map((image) => moveToPermamentFolder(image?.public_id))
    // );

    const permanentPropertyImages = await Promise.all(
      property_images.map((image) => {
        if (image?.public_id) {
          return moveToPermamentFolder(image.public_id);
        } else {
          logger.warn('Image is missing public_id:', image);
          return null; // Or handle as you wish if public_id is missing
        }
      })
    );
    const prop = await RealtorProperties.create({
      property_name,
      property_description,
      address,
      country,
      state,
      city,
      property_details,
      feature_image: permanentFeatureImage,
      property_images: permanentPropertyImages,
      status,
      user: req.user._id,
    });

    const property = await populateUserDetails(prop);
    // Delete temporary images after successful property creation
    await deleteFromCloudinary(featImage.public_id);
    await Promise.all(
      property_images.map((image) => deleteFromCloudinary(image.public_id))
    );
    res.status(201).json({ message: 'Property added successfully', property });
  } catch (err) {
    logger.error('Error adding property:', err);
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
    let { page = 1, limit = 10, q, state, country, property_type } = req.query;

    let query = { user: req.user._id };

    if (q) {
      query['$text'] = { $search: q, $language: 'en' };
    }

    if (state) {
      query.state = state;
    }
    if (country) {
      query.country = country;
    }
    if (property_type) {
      query['property_details.property_type'] = property_type;
    }
    // if (property_type) {
    //   query.property_details = { $elemMatch: { property_type: property_type } };
    // }
    // if (propertyType) {
    //   query['property_details.property_type'] = { $eq: property_type };
    // }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    const properties = await RealtorProperties.find(query)
      .skip(skip)
      .limit(limit);
    const totalProperties = await RealtorProperties.countDocuments({
      user: req.user._id,
    });
    res.status(200).json({
      properties,
      message: 'Properties fetched successfully',
      metadata: {
        totalProperties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: page,
      },
    });
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
      .status(result.code)
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
// const deleteProperty = async (req, res) => {
//   const { id } = req.params;
//   try {
//     // delete only user properties

//     const property = await RealtorProperties.findOneAndDelete({
//       _id: id,
//       user: req.user._id,
//     });
//     const result = await getProperty(property);
//     // Check if the property was found
//     if (!result.success) {
//       return res.status(result.code).json({ message: 'Property not found' });
//     }

//     // Delete images from Cloudinary
//     if (property.feature_image) {
//       await deleteFromCloudinary(property.feature_image);
//     }
//     if (property.property_images && property.property_images.length > 0) {
//       for (const imageUrl of property.property_images) {
//         await deleteFromCloudinary(imageUrl);
//       }
//     }
//     res.status(result.code).json({ message: 'Property deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await RealtorProperties.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Delete images from Cloudinary
    if (property.feature_image) {
      await deleteFromCloudinary(property.feature_image.public_id);
    }
    if (property.property_images && property.property_images.length > 0) {
      for (const image of property.property_images) {
        await deleteFromCloudinary(image.public_id);
      }
    }

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (err) {
    logger.error('Error deleting property:', err);
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
    if (req.user.isBanned) {
      return res.status(403).json({ message: 'You are banned', status: 403 });
    }

    const property = await RealtorProperties.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const imagesToDelete = [];

    // Handle feature image update
    if (
      req.body.feature_image &&
      req.body.feature_image.public_id !== req.body.current_feature_image_id
    ) {
      imagesToDelete.push(req.body.current_feature_image_id);
      const newFeatureImage = await moveToPermamentFolder(
        req.body.feature_image.public_id
      );

      property.feature_image = {
        public_id: newFeatureImage.public_id,
        url: newFeatureImage.url,
      };
    }

    // Handle property images update
    if (req.body.property_images) {
      const newPublicIds = new Set(
        req.body.property_images.map((img) => img.public_id)
      );
      const currentPublicIds = new Set(
        req.body.current_property_image_ids || []
      );

      // Identify images to delete
      currentPublicIds.forEach((id) => {
        if (!newPublicIds.has(id)) {
          imagesToDelete.push(id);
        }
      });

      // Move new and updated images to permanent folder
      property.property_images = await Promise.all(
        req.body.property_images.map(async (image) => {
          if (image.public_id.startsWith('temp_properties/')) {
            const newImage = await moveToPermamentFolder(image.public_id);

            return {
              public_id: newImage.public_id,
              url: newImage.url,
            };
          }
          return image;
        })
      );
    }

    // Remove feature_image from req.body to avoid overwriting the permanent one
    delete req.body.feature_image;
    delete req.body.property_images;
    // Update other fields
    Object.assign(property, req.body);
    await property.save();

    // Delete unused images after successful property update
    for (const publicId of imagesToDelete) {
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    const result = await getProperty(property);

    res.status(result.code).json({
      property: result.data,
      message: 'Property updated successfully',
    });
  } catch (err) {
    logger.error('Error editing property:', err);
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
