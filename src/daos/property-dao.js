import RealtorProperties from '../models/v1/realtor/property.js';

/**
 * Populates the 'user' field of a given property with the user's first name, last name, and phone number.
 *
 * @param {Object} property - The property object which has a 'user' field to populate.
 * @param {Object} property.populate - A method to populate the specified path in the property object.
 * @param {string} property.populate.path - The path to populate in the property object.
 * @param {string} property.populate.select - The fields to select for the populated path.
 * @returns {Promise<Object>} A promise that resolves to the property object with the populated user details.
 *
 * @example
 * const populatedProperty = await populateUserDetails(property);
 * console.log(populatedProperty.user.first_name); // Outputs the first name of the user
 */

const populateUserDetails = async (property) => {
  return await property.populate({
    path: 'user',
    select: 'first_name last_name phone_number',
  });
};

/**
 * Retrieves a property from the database.
 *
 * @param {Object} property - The property object to retrieve.
 * @return {Promise<Object>} An object containing the result of the property retrieval.
 * @return {boolean} returnObject.success - Indicates if the retrieval was successful.
 * @return {Object|null} returnObject.data - The retrieved property object, or null if not found.
 * @return {number} returnObject.code - The HTTP status code of the retrieval.
 */
const getProperty = async (property) => {
  if (!property) {
    return {
      success: false,
      data: null,
      code: 404,
    };
  }
  return {
    success: true,
    data: property,
    code: 200,
  };
};

export { populateUserDetails, getProperty };
