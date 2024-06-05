/**
 * Checks the admin status and returns an object indicating success and the corresponding status code.
 *
 * @param {string} adminStatus - The admin status to check.
 * @return {Promise<Object>} An object with the following properties:
 *   - success: A boolean indicating whether the admin status is 'superAdmin'.
 *   - code: The status code to be returned (401 if admin status is not 'superAdmin', 200 otherwise).
 */
const checkAdminStatus = async (adminStatus) => {
  if (adminStatus !== 'superAdmin') {
    return {
      success: false,
      code: 401,
    };
  }
  return {
    success: true,
    code: 200,
  };
};

export { checkAdminStatus };
