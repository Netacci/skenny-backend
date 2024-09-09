import { populateUserDetails } from '../../../daos/property-dao.js';
import RealtorProperties from '../../../models/v1/realtor/property.js';

/**
 * Retrieves all approved properties from the database based on the provided query parameters.
 *
 * @param {Object} req - The request object containing query parameters.
 * @param {Object} res - The response object.
 * @return {Promise<void>} - A promise that resolves when the properties are fetched and sent as a response.
 *                          - The response includes the fetched properties, a success message, and metadata about the properties.
 * @throws {Error} - If an error occurs while fetching the properties, the error message is sent as a response.
 */

const getAllProperties = async (req, res) => {
  try {
    // Limits retrieved properties to 10 per page when no limit is passed
    let { page = 1, limit = 10, q, state, country, propertyType } = req.query;
    let query = { status: 'approved' };

    if (q) {
      query['$text'] = { $search: q, $language: 'en' };
    }

    if (state) {
      query.state = state;
    }
    if (country) {
      query.country = country;
    }
    if (propertyType) {
      query['property_details.property_type'] = propertyType;
    }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;
    const properties = await RealtorProperties.find(query)
      .skip(skip)
      .limit(limit);
    const totalProperties = await RealtorProperties.countDocuments({
      status: 'approved',
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
