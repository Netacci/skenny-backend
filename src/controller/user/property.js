import { populateUserDetails } from '../../daos/property-dao.js';
import RealtorProperties from '../../models/realtor/realtor.js';

/**
 * Retrieves all properties from the database.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when all properties are fetched or an error occurs.
 *
 * @example
 * // Example usage in an Express route
 * app.get('/properties', getAllProperties
 */
const getAllProperties = async (req, res) => {
  try {
    const properties = await RealtorProperties.find({});
    res
      .status(200)
      .json({ properties, message: 'Properties fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/**
 * Retrieves a single property by its ID from the database.
 *
 * @param {Object} req - The request object containing the ID of the property.
 * @param {Object} res - The response object used to send the property data or an error message.
 * @return {Promise<void>} - Returns a promise that resolves when the property data is sent or an error message is sent.
 */
const getSingleProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const prop = await RealtorProperties.findOne({ _id: id });
    if (!prop) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = await populateUserDetails(prop);
    res
      .status(200)
      .json({ property, message: 'Property fetched successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getAllProperties, getSingleProperty };
